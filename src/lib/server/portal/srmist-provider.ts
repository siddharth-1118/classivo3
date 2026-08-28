import axios, { type AxiosInstance } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import * as cheerio from "cheerio";
import * as fs from "fs/promises";
import * as path from "path";
import type {
  PortalLoginSession,
  DashboardData,
  ProfileData,
  GradesData,
  HostelData,
  ExamTimetableData,
  UpcomingExam,
} from "@/lib/types/portal";
import type { StudentPortalProvider, LoginErrorCode } from "./portal-provider";
import { portalSessionStore } from "./session-store";
import { parseDashboard } from "../parsers/parse-dashboard";
import { parseProfile } from "../parsers/parse-profile";
import { parseGrades } from "../parsers/parse-grades";
import { parseHostel } from "../parsers/parse-hostel";
import { parseExamTimetable } from "../parsers/parse-exam-timetable";
import { env } from "@/config/env";

const SRMIST_PORTAL_URLS = {
  base: "https://sp.srmist.edu.in",
  login:
    "https://sp.srmist.edu.in/srmiststudentportal/students/loginManager/youLogin.jsp",
  loginServlet:
    "https://sp.srmist.edu.in/srmiststudentportal/LoginServlet",
  dashboard:
    "https://sp.srmist.edu.in/srmiststudentportal/students/dashboard",
  profile: "https://sp.srmist.edu.in/srmiststudentportal/students/profile",
  grades: "https://sp.srmist.edu.in/srmiststudentportal/students/grades",
  hostel: "https://sp.srmist.edu.in/srmiststudentportal/students/hostel",
  examTimetable:
    "https://sp.srmist.edu.in/srmiststudentportal/students/exam-timetable",
} as const;

const ASPNET_HIDDEN_FIELDS = [
  "__VIEWSTATE",
  "__VIEWSTATEGENERATOR",
  "__EVENTVALIDATION",
  "__EVENTTARGET",
  "__EVENTARGUMENT",
  "__LASTFOCUS",
  "__PREVIOUSPAGE",
] as const;

const CAPTCHA_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCaptchaText(length: number = 6): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CAPTCHA_CHARS.charAt(
      Math.floor(Math.random() * CAPTCHA_CHARS.length),
    );
  }
  return result;
}

function generateMockCaptcha(): { answer: string; dataUrl: string } {
  const answer = randomCaptchaText(6);
  const width = 200;
  const height = 70;

  const lines = Array.from({ length: 8 })
    .map(
      () =>
        `<line x1="${Math.random() * width}" y1="${
          Math.random() * height
        }" x2="${Math.random() * width}" y2="${
          Math.random() * height
        }" stroke="rgba(80,80,80,0.25)" stroke-width="1"/>`,
    )
    .join("");

  const dots = Array.from({ length: 40 })
    .map(
      () =>
        `<circle cx="${Math.random() * width}" cy="${
          Math.random() * height
        }" r="${Math.random() * 1.5 + 0.5}" fill="rgba(60,60,60,0.35)"/>`,
    )
    .join("");

  const colors = ["#1a365d", "#2b6cb0", "#2c5282", "#2f855a", "#9c4221"];
  const letters = answer
    .split("")
    .map((ch, i) => {
      const x = 22 + i * 28;
      const y = 45 + (Math.random() - 0.5) * 10;
      const angle = (Math.random() - 0.5) * 25;
      const color = colors[Math.floor(Math.random() * colors.length)];
      return `<text x="${x}" y="${y}" font-size="32" font-weight="700" fill="${color}" font-family="Georgia, 'Times New Roman', serif" transform="rotate(${angle} ${x} ${y})">${ch}</text>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="g-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f7fafc"/>
        <stop offset="100%" stop-color="#edf2f7"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g-bg)" rx="6" ry="6"/>
    ${lines}
    ${dots}
    ${letters}
  </svg>`;

  const base64 = Buffer.from(svg, "utf-8").toString("base64");
  return {
    answer,
    dataUrl: `data:image/svg+xml;base64,${base64}`,
  };
}

function normalizeWhitespace(text: string | undefined | null): string {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}

function extractHiddenFields(html: string): Record<string, string> {
  const $ = cheerio.load(html);
  const hiddenFields: Record<string, string> = {};

  $("input[type='hidden']").each((_, el) => {
    const name = $(el).attr("name");
    const value = $(el).val() as string;
    if (name) {
      const isAspNet = ASPNET_HIDDEN_FIELDS.includes(
        name as (typeof ASPNET_HIDDEN_FIELDS)[number],
      );
      if (isAspNet || value !== "") {
        hiddenFields[name] = value ?? "";
      }
    }
  });

  return hiddenFields;
}

function extractCaptchaSrc(
  html: string,
  baseUrl: string,
): string | undefined {
  const $ = cheerio.load(html);
  const img = $(
    "img[id*='captcha' i], img[src*='captcha' i], img[class*='captcha' i], img[alt*='captcha' i]",
  ).first();

  if (img.length === 0) return undefined;
  const src = img.attr("src") || img.attr("data-src");
  if (!src) return undefined;

  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("/")) return new URL(src, baseUrl).toString();
  return new URL(src, baseUrl).toString();
}

function randomHex(length: number): string {
  const bytes = new Uint8Array(Math.max(1, Math.ceil(length / 2)));
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, length);
}

function makePortalSession(
  hiddenFields: Record<string, string>,
  jar: CookieJar,
  createdAt: number = Date.now(),
): { session: PortalLoginSession; jarSer: unknown } {
  const cookies: Record<string, string> = {};
  try {
    const jarCookies = jar.toJSON();
    if (jarCookies && Array.isArray(jarCookies.cookies)) {
      for (const c of jarCookies.cookies) {
        if (c && typeof c === "object" && "key" in c && "value" in c) {
          cookies[(c as { key: string }).key] = String(
            (c as { value: unknown }).value ?? "",
          );
        }
      }
    }
  } catch {
    // ignore
  }

  const session: PortalLoginSession = {
    sessionToken: `sess-${randomHex(40)}`,
    cookies,
    createdAt,
    hiddenFields,
  };

  let jarSer: unknown = undefined;
  try {
    jarSer = jar.toJSON();
    session._cookieJarSer = jarSer;
  } catch {
    // ignore
  }

  return { session, jarSer };
}

function isMockModeActive(): boolean {
  if (env.MOCK_MODE === true) return true;
  const base = env.SRMIST_PORTAL_BASE_URL;
  if (!base) return true;
  return false;
}

function ensureDir(dirPath: string): Promise<void> {
  return fs.mkdir(dirPath, { recursive: true }).then(() => undefined).catch(() => undefined);
}

const DEBUG_SNAPSHOTS =
  (process.env.DEBUG_SNAPSHOTS === "true" ||
    process.env.DEBUG_SNAPSHOTS === "1") &&
  env.NODE_ENV !== "production";

function classsifyLoginErrorFromHtml(
  html: string,
): { code: LoginErrorCode; message: string } | null {
  const $ = cheerio.load(html);
  const errorSelectors = [
    "[id*='Error' i]",
    "[class*='error' i]",
    "[class*='alert-danger' i]",
    ".validation-summary-errors",
    ".error-message",
    "#error-message",
  ];

  let detected = "";
  for (const sel of errorSelectors) {
    const text = normalizeWhitespace($(sel).first().text());
    if (text.length > 2) {
      detected = text;
      break;
    }
  }

  if (!detected) {
    const lower = html.toLowerCase();
    const captchaIdx = lower.indexOf("captcha");
    if (captchaIdx >= 0) {
      const snippet = lower.slice(
        Math.max(0, captchaIdx - 80),
        captchaIdx + 120,
      );
      if (
        /invalid|wrong|incorrect|expired|not match|mismatch/.test(snippet) ||
        /captcha.{0,80}(invalid|wrong|incorrect)/.test(lower)
      ) {
        return {
          code: "INVALID_CAPTCHA",
          message: "The captcha you entered is invalid or expired.",
        };
      }
    }

    if (
      /invalid (user(name|id)|password|credential)/i.test(lower) ||
      /wrong (user(name|id)|password|credential)/i.test(lower) ||
      /(user(name|id)|password).{0,60}incorrect/i.test(lower) ||
      /login failed/i.test(lower)
    ) {
      return {
        code: "INVALID_CREDENTIALS",
        message:
          "The net ID or password you entered is incorrect. Please try again.",
      };
    }
    return null;
  }

  const lower = detected.toLowerCase();
  if (lower.includes("captcha")) {
    return {
      code: "INVALID_CAPTCHA",
      message: detected,
    };
  }
  if (
    lower.includes("password") ||
    lower.includes("username") ||
    lower.includes("invalid") ||
    lower.includes("incorrect") ||
    lower.includes("wrong")
  ) {
    return {
      code: "INVALID_CREDENTIALS",
      message: detected,
    };
  }
  if (
    lower.includes("session") ||
    lower.includes("timeout") ||
    lower.includes("expired")
  ) {
    return {
      code: "SESSION_EXPIRED",
      message: detected,
    };
  }

  return {
    code: "INVALID_CREDENTIALS",
    message: detected,
  };
}

function richMockDashboard(netId?: string): DashboardData {
  const now = new Date();
  const iso = now.toISOString();

  if (netId?.toLowerCase() === "sv3824") {
    return {
      sourceTimestamp: iso,
      lastSynced: iso,
      studentName: "VOOKA SAI SIDDHARTH",
      studentId: "687469",
      registerNumber: "RA2511026010906",
      email: "sv3824@srmist.edu.in",
      institution: "Faculty of Engineering and Technology, Kattankulathur",
      program: "B.Tech.-Computer Science and Engineering with specialization in Artificial Intelligence and Machine Learning[UG - FT - ACADEMIC]",
      semester: 3,
      batch: "2",
      section: "S2",
      roomNo: "Hostel-305",
      facultyAdvisor: "Dr.Kothai G [kothaig2@srmist.edu.in]",
      academicAdvisor: "Dr. PRIYA VENKATESAN [priyav@srmist.edu.in]",
      currentStatus: "Active",
      cgpa: 9.15,
      latestSgpa: 9.35,
      creditsEarned: 76,
      creditsRegistered: 80,
      hostelStatus: "Hosteller",
      hostelRoomDetails: {
        hostelName: "Block C - Nelson Mandela",
        roomNo: "305",
        block: "C",
        floor: "Third",
        bedNo: "1",
      },
      upcomingExams: [
        {
          examTitle: "Mid Semester Assessment",
          program: "B.Tech - CSE",
          semester: 3,
          courseCode: "18CSB202T",
          courseName: "Object Oriented Design and Analysis",
          examDate: new Date(now.getTime() + 3 * 24 * 3600 * 1000).toISOString().split("T")[0],
          session: "FN",
          venue: "Tech Park 405",
          seatNumber: "A-24",
          time: "09:00 AM - 11:30 AM",
          examType: "INTERNAL",
          daysUntil: 3,
        }
      ],
      notices: [
        {
          id: "n-001",
          title: "Attendance check warning released for Semester 3",
          date: "2026-08-08",
          category: "Academic",
          content: "Ensure attendance is maintained above 75% for appearing in end-semester examinations.",
        }
      ],
    };
  }

  const upcomingExams: UpcomingExam[] = [
    {
      examTitle: "Mid Semester Assessment",
      program: "B.Tech - CSE (AI & ML)",
      semester: 6,
      courseCode: "CSE601",
      courseName: "Large Language Models and Generative AI",
      examDate: new Date(now.getTime() + 2 * 24 * 3600 * 1000)
        .toISOString()
        .split("T")[0],
      session: "FN",
      venue: "Examination Hall - II, University Building",
      seatNumber: "CSE-047",
      time: "09:00 AM - 12:00 PM",
      remarks: "Closed book exam. Bring calculator.",
      examType: "INTERNAL",
      daysUntil: 2,
    },
    {
      examTitle: "Mid Semester Assessment",
      program: "B.Tech - CSE (AI & ML)",
      semester: 6,
      courseCode: "CSE602",
      courseName: "Cloud Computing and DevOps",
      examDate: new Date(now.getTime() + 5 * 24 * 3600 * 1000)
        .toISOString()
        .split("T")[0],
      session: "FN",
      venue: "Examination Hall - I, University Building",
      seatNumber: "CSE-112",
      time: "09:00 AM - 12:00 PM",
      examType: "INTERNAL",
      daysUntil: 5,
    },
    {
      examTitle: "Mid Semester Assessment",
      program: "B.Tech - CSE (AI & ML)",
      semester: 6,
      courseCode: "CSE604",
      courseName: "Advanced Data Structures and Algorithms",
      examDate: new Date(now.getTime() + 8 * 24 * 3600 * 1000)
        .toISOString()
        .split("T")[0],
      session: "AN",
      venue: "Examination Hall - III, University Building",
      seatNumber: "CSE-076",
      time: "02:00 PM - 05:00 PM",
      examType: "INTERNAL",
      daysUntil: 8,
    },
  ];

  return {
    sourceTimestamp: iso,
    lastSynced: iso,
    studentName: "Arjun Kumar Sharma",
    studentId: "STU202100123",
    registerNumber: "RA2111047010001",
    email: "arjun.sharma@srmist.edu.in",
    institution: "SRM Institute of Science and Technology, Kattankulathur",
    program: "B.Tech - Computer Science and Engineering (AI & ML)",
    semester: 6,
    batch: "2021 - 2025",
    section: "B",
    roomNo: "B-324",
    facultyAdvisor: "Dr. Priya Venkatesan",
    academicAdvisor: "Dr. Karthik Srinivasan",
    currentStatus: "Currently Enrolled - Active",
    cgpa: 8.62,
    latestSgpa: 9.01,
    creditsEarned: 148,
    creditsRegistered: 152,
    hostelStatus: "Hosteller",
    hostelRoomDetails: {
      hostelName: "Block B - Meenakshi",
      roomNo: "324",
      block: "B",
      floor: "Third",
      bedNo: "2",
    },
    upcomingExams,
    notices: [
      {
        id: "n-001",
        title: "Mid-Semester Examination Schedule Released for Autumn 2024",
        date: "2024-10-12",
        category: "Academic",
        content:
          "The schedule for the mid-semester examinations has been published. Students can view their individual timetable and download hall tickets from the portal.",
      },
      {
        id: "n-002",
        title: "Course Registration for Winter Semester 2025 Opens November 1",
        date: "2024-10-10",
        category: "Registrations",
        content:
          "Course registration for the Winter Semester 2024-2025 will open from 1st November 2024. Please ensure all dues are cleared before registration.",
      },
      {
        id: "n-003",
        title: "Workshop on Generative AI and LLMs - Register by Oct 20",
        date: "2024-10-08",
        category: "Events",
        content:
          "A three-day hands-on workshop on Generative AI and Large Language Models will be conducted from October 23-25, 2024. Limited seats.",
      },
    ],
  };
}

function richMockProfile(netId?: string): ProfileData {
  const iso = new Date().toISOString();

  if (netId?.toLowerCase() === "sv3824") {
    return {
      sourceTimestamp: iso,
      studentName: "VOOKA SAI SIDDHARTH",
      studentId: "687469",
      registerNo: "RA2511026010906",
      emailId: "sv3824@srmist.edu.in",
      alternateEmail: "vooka.siddharth@gmail.com",
      mobile: "+91 99887 76655",
      alternateMobile: "+91 99887 76656",
      institution: "Faculty of Engineering and Technology, Kattankulathur",
      program: "B.Tech.-Computer Science and Engineering with specialization in Artificial Intelligence and Machine Learning[UG - FT - ACADEMIC]",
      semester: 3,
      batch: "2",
      section: "S2",
      roomNo: "Hostel-305",
      enrollmentDate: "2024-08-02",
      currentSemCourseEnrollmentDate: "-",
      facultyAdvisor: "Dr.Kothai G [kothaig2@srmist.edu.in]",
      academicAdvisor: "Dr. PRIYA VENKATESAN [priyav@srmist.edu.in]",
      currentStatus: "Active",
      dateOfBirth: "2006-03-15",
      gender: "Male",
      bloodGroup: "B+",
      nationality: "Indian",
      photoUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='120' height='120' fill='%230284c7' rx='60'/><text x='50%25' y='55%25' text-anchor='middle' font-family='Arial' font-size='44' fill='white' font-weight='bold'>VS</text></svg>",
      address: {
        line1: "Sector 4, Dwarka",
        line2: "Near Metro Station",
        city: "New Delhi",
        state: "Delhi",
        pincode: "110075",
        country: "India",
      },
      parentDetails: {
        fatherName: "Vooka Srinivasa Rao",
        motherName: "Vooka Lakshmi",
        fatherContact: "+91 99887 76655",
      },
      academicInfo: {
        specialization: "Artificial Intelligence and Machine Learning",
        department: "Department of Computing Technologies",
        academicYear: "2025 - 2026",
        rollNumber: "CSE-24-305",
        scheme: "Full Time - Regular (CBCS)",
        admissionMode: "SRMJEEE 2024",
        admissionDate: "2024-08-02",
      },
    };
  }

  const name = netId ? netId.trim().toUpperCase() : "Arjun Kumar Sharma";
  return {
    sourceTimestamp: iso,
    studentName: name,
    studentId: "STU202100123",
    registerNo: "RA2111047010001",
    emailId: netId ? `${netId.toLowerCase()}@srmist.edu.in` : "arjun.sharma@srmist.edu.in",
    alternateEmail: "arjun.kumar.sharma@outlook.com",
    mobile: "+91 98765 43210",
    alternateMobile: "+91 98765 43211",
    institution: "SRM Institute of Science and Technology, Kattankulathur",
    program: "B.Tech - Computer Science and Engineering (AI & ML)",
    semester: 6,
    batch: "2021 - 2025",
    section: "B",
    roomNo: "B-324",
    enrollmentDate: "2021-08-02",
    currentSemCourseEnrollmentDate: "2024-08-05",
    facultyAdvisor: "Dr. Priya Venkatesan",
    academicAdvisor: "Dr. Karthik Srinivasan",
    currentStatus: "Currently Enrolled - Active",
    dateOfBirth: "2003-05-14",
    gender: "Male",
    bloodGroup: "O+",
    nationality: "Indian",
    photoUrl:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='120' height='120' fill='%234f46e5' rx='60'/><text x='50%25' y='55%25' text-anchor='middle' font-family='Arial' font-size='44' fill='white' font-weight='bold'>AS</text></svg>",
    address: {
      line1: "14, Green Park, Main Market Road",
      line2: "Near City Hospital, Civil Lines",
      city: "Kanpur",
      state: "Uttar Pradesh",
      pincode: "208001",
      country: "India",
    },
    parentDetails: {
      fatherName: "Ravi Kishore Sharma",
      motherName: "Priya Sharma",
      guardianName: "Ramesh Chandra",
      fatherContact: "+91 99887 76655",
      motherContact: "+91 99887 76656",
      guardianContact: "+91 98111 22233",
    },
    academicInfo: {
      specialization: "Artificial Intelligence and Machine Learning",
      department: "Department of Computing Technologies",
      academicYear: "2024 - 2025",
      rollNumber: "CSE-21-245",
      scheme: "Full Time - Regular (CBCS)",
      admissionMode: "SRMJEEE 2021",
      admissionDate: "2021-08-02",
    },
  };
}

function richMockGrades(): GradesData {
  const iso = new Date().toISOString();
  return {
    sourceTimestamp: iso,
    grades: [
      {
        semester: 1,
        examMonthYear: "December 2021",
        code: "CSE101",
        title: "Introduction to Programming Using C",
        credit: 4,
        grade: "B",
      },
      {
        semester: 1,
        examMonthYear: "December 2021",
        code: "CSE102",
        title: "Data Structures and Algorithms",
        credit: 4,
        grade: "A",
      },
      {
        semester: 1,
        examMonthYear: "December 2021",
        code: "MAT101",
        title: "Engineering Mathematics I",
        credit: 4,
        grade: "B+",
      },
      {
        semester: 2,
        examMonthYear: "May 2022",
        code: "CSE201",
        title: "Object Oriented Programming with Java",
        credit: 4,
        grade: "A",
      },
      {
        semester: 2,
        examMonthYear: "May 2022",
        code: "CSE202",
        title: "Database Management Systems",
        credit: 4,
        grade: "A-",
      },
      {
        semester: 3,
        examMonthYear: "December 2022",
        code: "CSE301",
        title: "Operating Systems",
        credit: 4,
        grade: "A+",
      },
      {
        semester: 3,
        examMonthYear: "December 2022",
        code: "CSE302",
        title: "Computer Networks",
        credit: 4,
        grade: "B+",
      },
      {
        semester: 4,
        examMonthYear: "May 2023",
        code: "CSE401",
        title: "Machine Learning",
        credit: 4,
        grade: "A+",
      },
      {
        semester: 4,
        examMonthYear: "May 2023",
        code: "CSE402",
        title: "Software Engineering",
        credit: 3,
        grade: "O",
      },
      {
        semester: 5,
        examMonthYear: "December 2023",
        code: "CSE501",
        title: "Artificial Intelligence",
        credit: 4,
        grade: "A+",
      },
      {
        semester: 5,
        examMonthYear: "December 2023",
        code: "CSE502",
        title: "Deep Learning Fundamentals",
        credit: 4,
        grade: "A",
      },
      {
        semester: 5,
        examMonthYear: "December 2023",
        code: "CSE503",
        title: "Full Stack Web Development Lab",
        credit: 2,
        grade: "O",
      },
    ],
    summary: {
      cgpa: 8.62,
      creditsRegistered: 152,
      creditsEarned: 148,
      creditsRequired: 160,
    },
    semesters: [
      {
        semester: 1,
        sgpa: 8.12,
        academicYear: "2021-2022",
        totalCredits: 24,
        earnedCredits: 23,
      },
      {
        semester: 2,
        sgpa: 8.34,
        academicYear: "2021-2022",
        totalCredits: 24,
        earnedCredits: 24,
      },
      {
        semester: 3,
        sgpa: 8.56,
        academicYear: "2022-2023",
        totalCredits: 25,
        earnedCredits: 25,
      },
      {
        semester: 4,
        sgpa: 8.78,
        academicYear: "2022-2023",
        totalCredits: 26,
        earnedCredits: 26,
      },
      {
        semester: 5,
        sgpa: 9.01,
        academicYear: "2023-2024",
        totalCredits: 25,
        earnedCredits: 25,
      },
      {
        semester: 6,
        sgpa: 0,
        academicYear: "2024-2025",
        totalCredits: 28,
        earnedCredits: 0,
      },
    ],
  };
}

function richMockHostel(): HostelData {
  const iso = new Date().toISOString();
  return {
    sourceTimestamp: iso,
    hostel: {
      academicYear: "Autumn Semester 2024 - 2025",
      hostelName: "Block B - Meenakshi",
      roomNo: "324",
      allotmentDate: "2024-07-22",
      feeAmount: 112500,
      payMode: "Online - UPI",
      admitCardAvailable: true,
      declarationFormAvailable: true,
    },
    booking: {
      academicYear: "2024-2025",
      applicationDate: "2024-06-15",
      preferredHostel: "Block B - Meenakshi",
      preferredRoomType: "Deluxe AC - Triple Occupancy",
      status: "Allotted",
      bookingStage: "Completed",
      allotment: {
        academicYear: "Autumn Semester 2024 - 2025",
        hostelName: "Block B - Meenakshi",
        roomNo: "324",
        block: "B",
        floor: "Third",
        bedNo: "2",
        allotmentDate: "2024-07-22",
        roomType: "Deluxe AC - Triple Occupancy",
        messPreference: "North Indian Veg - Mess A",
        status: "Active",
      },
    },
    payments: [
      {
        academicYear: "2024-2025",
        feeAmount: 112500,
        feeDescription: "Hostel Accommodation Fee - Autumn Semester 2024",
        payMode: "Online - UPI",
        transactionId: "UPI-241014987654321",
        paymentDate: "2024-10-14",
        dueDate: "2024-10-31",
        status: "Paid",
        receiptNumber: "RCPT-24-784321",
      },
      {
        academicYear: "2024-2025",
        feeAmount: 12000,
        feeDescription: "Mess Advance - October 2024",
        payMode: "Online - Net Banking",
        transactionId: "NEFT-241002123456",
        paymentDate: "2024-10-02",
        dueDate: "2024-10-05",
        status: "Paid",
        receiptNumber: "RCPT-24-782014",
      },
      {
        academicYear: "2024-2025",
        feeAmount: 5000,
        feeDescription: "Laundry Services Annual Fee",
        payMode: "Online - Debit Card",
        paymentDate: "2024-07-30",
        dueDate: "2024-08-01",
        status: "Paid",
        receiptNumber: "RCPT-24-771234",
      },
      {
        academicYear: "2021-2022",
        feeAmount: 15000,
        feeDescription: "Hostel Caution Deposit (Refundable)",
        payMode: "Demand Draft",
        paymentDate: "2021-07-28",
        dueDate: "2021-08-01",
        status: "Paid",
        receiptNumber: "RCPT-21-112003",
      },
      {
        academicYear: "2024-2025",
        feeAmount: 2500,
        feeDescription: "Medical Facility Annual Charge",
        payMode: "",
        dueDate: "2024-08-01",
        status: "Unpaid",
      },
    ],
    allotments: [
      {
        academicYear: "Autumn Semester 2024 - 2025",
        hostelName: "Block B - Meenakshi",
        roomNo: "324",
        block: "B",
        floor: "Third",
        bedNo: "2",
        allotmentDate: "2024-07-22",
        roomType: "Deluxe AC - Triple Occupancy",
        messPreference: "North Indian Veg - Mess A",
        status: "Active",
      },
      {
        academicYear: "Spring Semester 2023 - 2024",
        hostelName: "Block B - Meenakshi",
        roomNo: "218",
        block: "B",
        floor: "Second",
        allotmentDate: "2024-01-10",
        roomType: "Standard - Triple Occupancy",
        status: "Completed",
      },
      {
        academicYear: "Autumn Semester 2023 - 2024",
        hostelName: "Block A - Ganga",
        roomNo: "105",
        block: "A",
        floor: "First",
        allotmentDate: "2023-07-24",
        roomType: "Standard - Four Occupancy",
        status: "Completed",
      },
    ],
    admitCardAvailable: true,
    declarationFormAvailable: true,
  };
}

function richMockExamTimetable(): ExamTimetableData {
  const iso = new Date().toISOString();
  return {
    sourceTimestamp: iso,
    lastUpdated: iso,
    academicYear: "2024 - 2025",
    semester: 6,
    examinationName: "Mid Semester Assessment - Autumn Semester 2024",
    program: "B.Tech - Computer Science and Engineering (AI & ML)",
    timetable: [
      {
        examTitle: "Mid Semester Assessment - Autumn Semester 2024",
        program: "B.Tech - CSE (AI & ML)",
        semester: 6,
        courseCode: "CSE601",
        courseName: "Large Language Models and Generative AI",
        examDate: "2024-11-04",
        session: "FN",
        venue: "Examination Hall - II, University Building",
        seatNumber: "CSE-047",
        time: "09:00 AM - 12:00 PM",
        remarks: "Closed book. Calculator allowed.",
        examType: "INTERNAL",
      },
      {
        examTitle: "Mid Semester Assessment - Autumn Semester 2024",
        program: "B.Tech - CSE (AI & ML)",
        semester: 6,
        courseCode: "CSE602",
        courseName: "Cloud Computing and DevOps",
        examDate: "2024-11-06",
        session: "FN",
        venue: "Examination Hall - I, University Building",
        seatNumber: "CSE-112",
        time: "09:00 AM - 12:00 PM",
        examType: "INTERNAL",
      },
      {
        examTitle: "Mid Semester Assessment - Autumn Semester 2024",
        program: "B.Tech - CSE (AI & ML)",
        semester: 6,
        courseCode: "CSE604",
        courseName: "Advanced Data Structures and Algorithms",
        examDate: "2024-11-08",
        session: "AN",
        venue: "Examination Hall - III, University Building",
        seatNumber: "CSE-076",
        time: "02:00 PM - 05:00 PM",
        examType: "INTERNAL",
      },
      {
        examTitle: "Mid Semester Assessment - Autumn Semester 2024",
        program: "B.Tech - CSE (AI & ML)",
        semester: 6,
        courseCode: "CSE603",
        courseName: "Capstone Project - Phase I (Thesis & Presentation)",
        examDate: "2024-11-11",
        session: "FN",
        venue: "Smart Class Room - SJT 401",
        seatNumber: "Panel C - 14",
        time: "09:00 AM - 12:00 PM",
        remarks: "Panel review. Bring project report.",
        examType: "VIVA",
      },
      {
        examTitle: "Mid Semester Assessment - Autumn Semester 2024",
        program: "B.Tech - CSE (AI & ML)",
        semester: 6,
        courseCode: "CSE605",
        courseName: "Professional Ethics and Human Values",
        examDate: "2024-11-13",
        session: "AN",
        venue: "Examination Hall - I, University Building",
        seatNumber: "CSE-059",
        time: "02:00 PM - 05:00 PM",
        examType: "INTERNAL",
      },
      {
        examTitle: "Mid Semester Assessment - Autumn Semester 2024",
        program: "B.Tech - CSE (AI & ML)",
        semester: 6,
        courseCode: "CSE606",
        courseName: "Cyber Security Fundamentals (Audit Course)",
        examDate: "2024-11-15",
        session: "FN",
        venue: "Examination Hall - IV, Annexure Building",
        seatNumber: "AUD-018",
        time: "09:00 AM - 11:00 AM",
        examType: "INTERNAL",
      },
    ],
    instructions: [
      "All students must report to the examination hall at least 30 minutes before the scheduled commencement of the examination.",
      "Students must carry their valid SRM Student ID Card and downloaded Hall Ticket for every examination without exception.",
      "Use of mobile phones, smart watches, Bluetooth devices, programmable calculators, or any other electronic gadgets inside the examination hall is strictly prohibited.",
      "Students should follow the dress code prescribed by the university during all examinations (formal dress with ID card worn visibly).",
      "Any form of malpractice, including copying, talking, exchanging materials, or possession of unauthorized material, will be viewed seriously and disciplinary action will be taken as per SRM University regulations.",
      "No re-examination or supplementary examination will be conducted for students who are absent from any examination for any reason whatsoever.",
      "Students must occupy the seats / desks allotted to them as per the seating arrangement displayed outside the examination halls, and as per the seat number on their hall ticket.",
      "Students are not permitted to leave the examination hall until the full duration of the examination has elapsed and the invigilator has collected and accounted for all answer scripts.",
    ],
  };
}

export class SRMISTPortalProvider implements StudentPortalProvider {
  private cookieJar: CookieJar;
  private client: AxiosInstance;
  private isMockMode: boolean;

  constructor(initialJar?: CookieJar) {
    this.cookieJar = initialJar ?? new CookieJar();
    this.isMockMode = isMockModeActive();

    const rawClient = axios.create({
      jar: this.cookieJar,
      withCredentials: true,
      baseURL: SRMIST_PORTAL_URLS.base,
      timeout: env.SRMIST_PORTAL_TIMEOUT_MS,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      },
      maxRedirects: 5,
    });

    this.client = wrapper(rawClient);
  }

  serializeCookieJar(): unknown {
    try {
      return this.cookieJar.toJSON();
    } catch {
      return undefined;
    }
  }

  async restoreCookieJar(serialized: unknown): Promise<void> {
    try {
      const jar = CookieJar.fromJSON(JSON.stringify(serialized));
      this.cookieJar = jar;
      const rawClient = axios.create({
        jar: this.cookieJar,
        withCredentials: true,
        baseURL: SRMIST_PORTAL_URLS.base,
        timeout: env.SRMIST_PORTAL_TIMEOUT_MS,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        },
        maxRedirects: 5,
      });
      this.client = wrapper(rawClient);
    } catch {
      // ignore invalid serialized state; keep empty jar
    }
  }

  private restoreFromSession(session: PortalLoginSession): void {
    if (session._cookieJarSer !== undefined && session._cookieJarSer !== null) {
      try {
        const jar = CookieJar.fromJSON(JSON.stringify(session._cookieJarSer));
        this.cookieJar = jar;
        const rawClient = axios.create({
          jar: this.cookieJar,
          withCredentials: true,
          baseURL: SRMIST_PORTAL_URLS.base,
          timeout: env.SRMIST_PORTAL_TIMEOUT_MS,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          },
          maxRedirects: 5,
        });
        this.client = wrapper(rawClient);
        return;
      } catch {
        // fall through to plain cookie restore
      }
    }

    if (session.cookies && typeof session.cookies === "object") {
      try {
        for (const [k, v] of Object.entries(session.cookies)) {
          if (!k) continue;
          void this.cookieJar.setCookieSync(
            `${encodeURIComponent(k)}=${encodeURIComponent(String(v ?? ""))}`,
            SRMIST_PORTAL_URLS.base,
          );
        }
      } catch {
        // ignore
      }
    }
  }

  async initLoginSession(): Promise<{
    requestId: string;
    captchaUrl: string;
    session: PortalLoginSession;
  }> {
    if (this.isMockMode) {
      const { answer, dataUrl } = generateMockCaptcha();
      const hiddenFields: Record<string, string> = {
        __VIEWSTATE:
          "/wEPDwUKMTIxOTYxNDIxMg9kFgICAw9kFgICAQ8PFgIeBFRleHQFDzIwMjQtMjAyNS1FdmVuVGVybRQCAQW8P",
        __VIEWSTATEGENERATOR: "C2EE9ABB",
        __EVENTVALIDATION:
          "/wEdAAYPdHJ1bnQ4dW5pcXVlS2V5TmFtZQAJdW5pcXVlS2V5VmFsdWU=",
      };
      const { session } = makePortalSession(
        hiddenFields,
        this.cookieJar,
        Date.now(),
      );
      const requestId = portalSessionStore.createTempPortalSession(
        session,
        answer,
      );
      return { requestId, captchaUrl: dataUrl, session };
    }

    try {
      const resp = await this.client.get(SRMIST_PORTAL_URLS.login, {
        headers: { Referer: SRMIST_PORTAL_URLS.base },
      });
      const html: string = resp.data ?? "";
      const hiddenFields = extractHiddenFields(html);
      const captchaSrc = extractCaptchaSrc(html, SRMIST_PORTAL_URLS.base);

      let captchaDataUrl = captchaSrc ?? "";
      if (captchaSrc) {
        try {
          const imgResp = await this.client.get(captchaSrc, {
            responseType: "arraybuffer",
            headers: { Referer: SRMIST_PORTAL_URLS.login },
          });
          const contentType =
            (imgResp.headers &&
              (imgResp.headers["content-type"] as string | undefined)) ||
            "image/png";
          const b64 = Buffer.from(imgResp.data as ArrayBuffer).toString(
            "base64",
          );
          captchaDataUrl = `data:${contentType};base64,${b64}`;
        } catch {
          captchaDataUrl = captchaSrc;
        }
      }

      const { session } = makePortalSession(
        hiddenFields,
        this.cookieJar,
        Date.now(),
      );

      const domainFieldNameMatch = html.match(/domainFieldName\s*=\s*['"]([^'"]+)['"]/);
      const domainFieldName = domainFieldNameMatch ? domainFieldNameMatch[1] : undefined;

      const captchaFieldNameMatch = html.match(/captchaFieldName\s*=\s*['"]([^'"]+)['"]/);
      const captchaFieldName = captchaFieldNameMatch ? captchaFieldNameMatch[1] : undefined;

      const randomDelimiterMatch = html.match(/randomDelimiter\s*=\s*['"]([^'"]+)['"]/);
      const randomDelimiter = randomDelimiterMatch ? randomDelimiterMatch[1] : undefined;

      session.domainFieldName = domainFieldName;
      session.captchaFieldName = captchaFieldName;
      session.randomDelimiter = randomDelimiter;

      const requestId = portalSessionStore.createTempPortalSession(session);
      return { requestId, captchaUrl: captchaDataUrl, session };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to initialize login session: ${error.code ?? error.message}`,
        );
      }
      throw error;
    }
  }

  async refreshCaptcha(
    requestId: string,
  ): Promise<{
    requestId: string;
    captchaUrl: string;
    session: PortalLoginSession;
  }> {
    if (this.isMockMode) {
      const existing = portalSessionStore.getTempPortalSession(requestId);
      const { answer, dataUrl } = generateMockCaptcha();

      if (existing) {
        portalSessionStore.storeTempCaptchaAnswer(requestId, answer);
        return {
          requestId,
          captchaUrl: dataUrl,
          session: existing.session,
        };
      }

      const hiddenFields: Record<string, string> = {
        __VIEWSTATE:
          "/wEPDwUKMTIxOTYxNDIxMg9kFgICAw9kFgICAQ8PFgIeBFRleHQFDzIwMjQtMjAyNS1FdmVuVGVybRQCAQW8P",
        __VIEWSTATEGENERATOR: "C2EE9ABB",
        __EVENTVALIDATION:
          "/wEdAAYPdHJ1bnQ4dW5pcXVlS2V5TmFtZQAJdW5pcXVlS2V5VmFsdWU=",
      };
      const { session } = makePortalSession(
        hiddenFields,
        this.cookieJar,
        Date.now(),
      );
      const newRequestId = portalSessionStore.createTempPortalSession(
        session,
        answer,
      );
      return { requestId: newRequestId, captchaUrl: dataUrl, session };
    }

    const existing = portalSessionStore.getTempPortalSession(requestId);
    try {
      if (existing) {
        this.restoreFromSession(existing.session);
      }

      const resp = await this.client.get(SRMIST_PORTAL_URLS.login, {
        headers: { Referer: SRMIST_PORTAL_URLS.base },
      });
      const html: string = resp.data ?? "";
      const hiddenFields = extractHiddenFields(html);
      const captchaSrc = extractCaptchaSrc(html, SRMIST_PORTAL_URLS.base);

      let captchaDataUrl = captchaSrc ?? "";
      if (captchaSrc) {
        try {
          const imgResp = await this.client.get(captchaSrc, {
            responseType: "arraybuffer",
            headers: { Referer: SRMIST_PORTAL_URLS.login },
          });
          const contentType =
            (imgResp.headers &&
              (imgResp.headers["content-type"] as string | undefined)) ||
            "image/png";
          const b64 = Buffer.from(imgResp.data as ArrayBuffer).toString(
            "base64",
          );
          captchaDataUrl = `data:${contentType};base64,${b64}`;
        } catch {
          captchaDataUrl = captchaSrc;
        }
      }

      const { session } = makePortalSession(
        hiddenFields,
        this.cookieJar,
        Date.now(),
      );

      const domainFieldNameMatch = html.match(/domainFieldName\s*=\s*['"]([^'"]+)['"]/);
      const domainFieldName = domainFieldNameMatch ? domainFieldNameMatch[1] : undefined;

      const captchaFieldNameMatch = html.match(/captchaFieldName\s*=\s*['"]([^'"]+)['"]/);
      const captchaFieldName = captchaFieldNameMatch ? captchaFieldNameMatch[1] : undefined;

      const randomDelimiterMatch = html.match(/randomDelimiter\s*=\s*['"]([^'"]+)['"]/);
      const randomDelimiter = randomDelimiterMatch ? randomDelimiterMatch[1] : undefined;

      session.domainFieldName = domainFieldName;
      session.captchaFieldName = captchaFieldName;
      session.randomDelimiter = randomDelimiter;

      if (existing) {
        const entry = (
          portalSessionStore as unknown as {
            tempSessions: Map<
              string,
              { session: PortalLoginSession; createdAt: number; lastCaptchaAnswer?: string }
            >;
          }
        ).tempSessions.get(requestId);
        if (entry) {
          entry.session = session;
          entry.createdAt = Date.now();
        }
        return { requestId, captchaUrl: captchaDataUrl, session };
      }

      const newRequestId = portalSessionStore.createTempPortalSession(session);
      return { requestId: newRequestId, captchaUrl: captchaDataUrl, session };
    } catch (error) {
      if (existing) {
        return {
          requestId,
          captchaUrl: "",
          session: existing.session,
        };
      }
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to refresh captcha: ${error.code ?? error.message}`,
        );
      }
      throw error;
    }
  }

  async login(input: {
    netid: string;
    password: string;
    captcha: string;
    requestId: string;
  }): Promise<{
    success: boolean;
    errorCode?: LoginErrorCode;
    errorMessage?: string;
  }> {
    const temp = portalSessionStore.consumeTempPortalSession(input.requestId);
    if (!temp) {
      return {
        success: false,
        errorCode: "SESSION_EXPIRED",
        errorMessage:
          "Your login session has expired or was already used. Please refresh the page and try again.",
      };
    }

    if (this.isMockMode) {
      const storedAnswer = temp.lastCaptchaAnswer ?? "";
      const captchaOk =
        input.captcha.toUpperCase() === storedAnswer.toUpperCase() ||
        input.captcha === "123456";

      if (!captchaOk) {
        return {
          success: false,
          errorCode: "INVALID_CAPTCHA",
          errorMessage:
            "The characters you entered do not match the captcha image. Please try again.",
        };
      }

      const trimmedNetid = input.netid.trim().toLowerCase();
      const trimmedPass = input.password.trim();

      let loginSuccessful = false;
      if (trimmedNetid === "sv3824" && (trimmedPass === "siddharth" || trimmedPass === "sv3824")) {
        loginSuccessful = true;
      } else if (trimmedNetid === "arjun" && (trimmedPass === "arjun123" || trimmedPass === "arjun")) {
        loginSuccessful = true;
      } else if (trimmedNetid !== "sv3824" && trimmedNetid !== "arjun" && trimmedPass === "password123") {
        loginSuccessful = true;
      }

      if (!loginSuccessful) {
        return {
          success: false,
          errorCode: "INVALID_CREDENTIALS",
          errorMessage:
            "Invalid login credentials The user ID or password entered is invalid. The login attempt was unsuccessful. You have 2 out of 3 login attempts remaining.",
        };
      }

      const { session } = temp;
      const updatedSession: PortalLoginSession = {
        ...session,
        _cookieJarSer: this.serializeCookieJar(),
        netId: input.netid,
      };

      portalSessionStore.storeAuthenticatedSession(input.netid, {
        loginSession: updatedSession,
        netId: input.netid,
        name: "Arjun Kumar Sharma",
        regNo: "RA2111047010001",
      });

      return { success: true };
    }

    try {
      this.restoreFromSession(temp.session);

      const hiddenFields = temp.session.hiddenFields ?? {};
      const formData = new URLSearchParams();

      formData.append("username", input.netid);
      formData.append("password", input.password);
      formData.append("captcha", input.captcha);

      // Inject dynamically-named security fields if they are parsed from the login page
      const { domainFieldName, captchaFieldName, randomDelimiter } = temp.session;

      if (domainFieldName) {
        // Reverse hostname btoa
        const reversedHost = "sp.srmist.edu.in".split("").reverse().join("");
        const domainTokenValue = Buffer.from(reversedHost).toString("base64");
        formData.append(domainFieldName, domainTokenValue);
      }

      if (captchaFieldName && randomDelimiter) {
        // Delimiter proof: elapsedSeconds + delimiter + interactCount (e.g. simulated load duration and user actions)
        const timeElapsed = Math.floor(Math.random() * 10) + 4; // 4-13 seconds load time
        const interactCount = Math.floor(Math.random() * 20) + 15; // 15-34 interactions
        const trapPayload = timeElapsed + randomDelimiter + interactCount;
        const captchaTokenValue = Buffer.from(trapPayload).toString("base64");
        formData.append(captchaFieldName, captchaTokenValue);
      }

      // Add a simulated Base64 telemetry fingerprint to complete browser check requirements
      const telemetry = {
        startTime: Date.now() - 10000,
        currentDomain: "sp.srmist.edu.in",
        timezoneOffset: -330,
        screenWidth: 1920,
        screenHeight: 1080,
        colorDepth: 24,
        devicePixelRatio: 1,
        platform: "Win32",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        language: "en-US",
        hardwareConcurrency: 8,
        deviceMemory: 8,
        touchSupport: false,
        webdriver: false,
        mouseClicks: 2,
        mouseMovements: 30,
        keystrokeCount: 15,
        typingSpeedMs: 3500,
        canvasHash: "e44c219a",
        submitTime: Date.now(),
        timeOnPageMs: 10000,
      };
      
      const safeBase64Encode = (str: string) => {
        return Buffer.from(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
          return String.fromCharCode(parseInt('0x' + p1, 16));
        })).toString("base64");
      };

      formData.append("telemetryPayload", safeBase64Encode(JSON.stringify(telemetry)));

      for (const [k, v] of Object.entries(hiddenFields)) {
        if (!formData.has(k)) {
          formData.append(k, v);
        }
      }

      const resp = await this.client.post(SRMIST_PORTAL_URLS.loginServlet, formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: SRMIST_PORTAL_URLS.login,
        },
        maxRedirects: 5,
      });

      const finalUrl: string | undefined =
        (resp.request &&
          resp.request.res &&
          (resp.request.res as { responseUrl?: string }).responseUrl) ||
        undefined;

      const redirectedAwayFromLogin =
        !!finalUrl && !/login([^a-z]|$)/i.test(finalUrl);
      const html: string = typeof resp.data === "string" ? resp.data : "";

      const $ = cheerio.load(html);
      const hasDashboardIndicators =
        $("[id*='dashboard' i], [class*='dashboard' i], a[href*='logout' i], a:contains('Logout'), a:contains('Sign Out')")
          .length > 0;
      const hasErrorIndicators =
        $("[id*='Error' i], [class*='alert-danger' i], [class*='error' i]").length >
        0;

      const loginOk =
        redirectedAwayFromLogin ||
        (hasDashboardIndicators && !hasErrorIndicators);

      if (loginOk) {
        const updatedSession: PortalLoginSession = {
          ...temp.session,
          hiddenFields: extractHiddenFields(html),
          _cookieJarSer: this.serializeCookieJar(),
          netId: input.netid,
        };

        try {
          const jarCookies = this.cookieJar.toJSON();
          if (jarCookies && Array.isArray(jarCookies.cookies)) {
            const cookies: Record<string, string> = {};
            for (const c of jarCookies.cookies) {
              if (c && typeof c === "object" && "key" in c && "value" in c) {
                cookies[(c as { key: string }).key] = String(
                  (c as { value: unknown }).value ?? "",
                );
              }
            }
            updatedSession.cookies = cookies;
          }
        } catch {
          // ignore
        }

        portalSessionStore.storeAuthenticatedSession(input.netid, {
          loginSession: updatedSession,
          netId: input.netid,
          name: input.netid,
          regNo: "",
        });

        return { success: true };
      }

      const detected = classsifyLoginErrorFromHtml(html);
      if (detected) {
        return {
          success: false,
          errorCode: detected.code,
          errorMessage: detected.message,
        };
      }

      return {
        success: false,
        errorCode: "INVALID_CREDENTIALS",
        errorMessage:
          "Login failed. Please verify your Net ID, password and captcha, then try again.",
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
          return {
            success: false,
            errorCode: "PORTAL_UNAVAILABLE",
            errorMessage:
              "The SRMIST portal is not responding right now. Please try again after some time.",
          };
        }
        if (
          error.code === "ENOTFOUND" ||
          error.code === "ECONNREFUSED" ||
          error.code === "EAI_AGAIN"
        ) {
          return {
            success: false,
            errorCode: "PORTAL_UNAVAILABLE",
            errorMessage:
              "Unable to reach the SRMIST portal. Please check your network connection or try again later.",
          };
        }
        if (error.response) {
          const status = error.response.status;
          if (status >= 500) {
            return {
              success: false,
              errorCode: "PORTAL_UNAVAILABLE",
              errorMessage: `The SRMIST portal returned a server error (${status}). Please try again later.`,
            };
          }
        }
        return {
          success: false,
          errorCode: "PORTAL_UNAVAILABLE",
          errorMessage: `Network error during login: ${error.code ?? error.message}`,
        };
      }

      return {
        success: false,
        errorCode: "PORTAL_UNAVAILABLE",
        errorMessage:
          error instanceof Error ? error.message : "Unknown error during login",
      };
    }
  }

  private async fetchPortalAuthenticatedPage(
    session: PortalLoginSession,
    relativeUrl: string,
    pageName: string,
  ): Promise<string> {
    this.restoreFromSession(session);

    const url = relativeUrl.startsWith("http")
      ? relativeUrl
      : new URL(relativeUrl, SRMIST_PORTAL_URLS.base).toString();

    const resp = await this.client.get(url, {
      headers: { Referer: SRMIST_PORTAL_URLS.base },
      maxRedirects: 5,
    });

    const finalUrl: string | undefined =
      (resp.request &&
        resp.request.res &&
        (resp.request.res as { responseUrl?: string }).responseUrl) ||
      undefined;

    if (finalUrl && /login([^a-z]|$)/i.test(finalUrl)) {
      const err = new Error("UNAUTHORIZED") as Error & { code?: string };
      err.code = "UNAUTHORIZED";
      throw err;
    }

    const html: string = typeof resp.data === "string" ? resp.data : "";

    if (DEBUG_SNAPSHOTS) {
      try {
        const baseDir =
          process.env.SNAPSHOTS_DIR ||
          path.join(process.cwd(), "data", "debug");
        await ensureDir(baseDir);
        const ts = Date.now();
        const safeName = pageName.replace(/[^a-zA-Z0-9_-]+/g, "_");
        const filePath = path.join(baseDir, `${safeName}-${ts}.html`);
        await fs.writeFile(filePath, html, "utf-8");
      } catch {
        // ignore snapshot write errors
      }
    }

    return html;
  }

  async getAuthenticatedDashboard(
    session: PortalLoginSession,
  ): Promise<DashboardData> {
    if (this.isMockMode) return richMockDashboard(session.netId);

    try {
      const html = await this.fetchPortalAuthenticatedPage(
        session,
        SRMIST_PORTAL_URLS.dashboard,
        "dashboard",
      );
      const parsed = parseDashboard(html) as unknown as DashboardData;
      return parsed;
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "UNAUTHORIZED"
      ) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        const err = new Error(
          `Portal unavailable while loading dashboard: ${error.code ?? error.message}`,
        ) as Error & { code?: LoginErrorCode };
        err.code = "PORTAL_UNAVAILABLE";
        throw err;
      }
      const err = new Error(
        error instanceof Error
          ? `Failed to parse dashboard data: ${error.message}`
          : "Failed to parse dashboard data",
      ) as Error & { code?: LoginErrorCode };
      err.code = "PARSE_FAILED";
      throw err;
    }
  }

  async getAuthenticatedProfile(
    session: PortalLoginSession,
  ): Promise<ProfileData> {
    if (this.isMockMode) return richMockProfile(session.netId);

    try {
      const html = await this.fetchPortalAuthenticatedPage(
        session,
        SRMIST_PORTAL_URLS.profile,
        "profile",
      );
      const parsed = parseProfile(html) as unknown as ProfileData;
      return parsed;
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "UNAUTHORIZED"
      ) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        const err = new Error(
          `Portal unavailable while loading profile: ${error.code ?? error.message}`,
        ) as Error & { code?: LoginErrorCode };
        err.code = "PORTAL_UNAVAILABLE";
        throw err;
      }
      const err = new Error(
        error instanceof Error
          ? `Failed to parse profile data: ${error.message}`
          : "Failed to parse profile data",
      ) as Error & { code?: LoginErrorCode };
      err.code = "PARSE_FAILED";
      throw err;
    }
  }

  async getAuthenticatedGrades(
    session: PortalLoginSession,
  ): Promise<GradesData> {
    if (this.isMockMode) return richMockGrades();

    try {
      const html = await this.fetchPortalAuthenticatedPage(
        session,
        SRMIST_PORTAL_URLS.grades,
        "grades",
      );
      const parsed = parseGrades(html) as unknown as GradesData;
      return parsed;
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "UNAUTHORIZED"
      ) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        const err = new Error(
          `Portal unavailable while loading grades: ${error.code ?? error.message}`,
        ) as Error & { code?: LoginErrorCode };
        err.code = "PORTAL_UNAVAILABLE";
        throw err;
      }
      const err = new Error(
        error instanceof Error
          ? `Failed to parse grades data: ${error.message}`
          : "Failed to parse grades data",
      ) as Error & { code?: LoginErrorCode };
      err.code = "PARSE_FAILED";
      throw err;
    }
  }

  async getAuthenticatedHostel(
    session: PortalLoginSession,
  ): Promise<HostelData> {
    if (this.isMockMode) return richMockHostel();

    try {
      const html = await this.fetchPortalAuthenticatedPage(
        session,
        SRMIST_PORTAL_URLS.hostel,
        "hostel",
      );
      const parsed = parseHostel(html) as unknown as HostelData;
      return parsed;
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "UNAUTHORIZED"
      ) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        const err = new Error(
          `Portal unavailable while loading hostel details: ${error.code ?? error.message}`,
        ) as Error & { code?: LoginErrorCode };
        err.code = "PORTAL_UNAVAILABLE";
        throw err;
      }
      const err = new Error(
        error instanceof Error
          ? `Failed to parse hostel data: ${error.message}`
          : "Failed to parse hostel data",
      ) as Error & { code?: LoginErrorCode };
      err.code = "PARSE_FAILED";
      throw err;
    }
  }

  async getAuthenticatedExamTimetable(
    session: PortalLoginSession,
  ): Promise<ExamTimetableData> {
    if (this.isMockMode) return richMockExamTimetable();

    try {
      const html = await this.fetchPortalAuthenticatedPage(
        session,
        SRMIST_PORTAL_URLS.examTimetable,
        "exam-timetable",
      );
      const parsed = parseExamTimetable(html) as unknown as ExamTimetableData;
      return parsed;
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "UNAUTHORIZED"
      ) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        const err = new Error(
          `Portal unavailable while loading exam timetable: ${error.code ?? error.message}`,
        ) as Error & { code?: LoginErrorCode };
        err.code = "PORTAL_UNAVAILABLE";
        throw err;
      }
      const err = new Error(
        error instanceof Error
          ? `Failed to parse exam timetable data: ${error.message}`
          : "Failed to parse exam timetable data",
      ) as Error & { code?: LoginErrorCode };
      err.code = "PARSE_FAILED";
      throw err;
    }
  }

  async logout(session: PortalLoginSession): Promise<void> {
    this.restoreFromSession(session);
    try {
      void this.cookieJar.removeAllCookiesSync?.();
    } catch {
      // ignore
    }
  }
}

let _singleton: SRMISTPortalProvider | undefined;

export function getSRMISTPortalProvider(): SRMISTPortalProvider {
  if (!_singleton) {
    _singleton = new SRMISTPortalProvider();
  }
  return _singleton;
}
