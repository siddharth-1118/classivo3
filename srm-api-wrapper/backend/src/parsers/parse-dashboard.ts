// @ts-nocheck
import * as cheerio from "cheerio";
import type { DashboardData, UpcomingExam } from "../../../../src/lib/types/portal";
import {
  normalizeWs,
  parseNum,
  parseDateDMYorMDY,
  buildKvMapFromTables,
  lookupKv,
  saveDebugSnapshot,
  selectText,
  findTableHeaders,
  matchColumnIndex,
} from "./parser-utils";

export const DASHBOARD_KV_SELECTORS = {
  studentName: ["student name", "name", "full name", "candidate name"],
  studentId: ["student id", "id", "enrollment no", "enrollment number"],
  registerNumber: ["register no", "registration no", "reg no", "registration number", "roll no"],
  email: ["email", "email id", "e-mail", "mail id"],
  institution: ["institution", "college", "university", "school", "institute name"],
  program: ["program", "course", "degree", "programme", "course name"],
  semester: ["semester", "sem", "current semester"],
  batch: ["batch", "batch year", "admission batch"],
  section: ["section", "class section"],
  roomNo: ["room no", "room number", "hostel room"],
  facultyAdvisor: ["faculty advisor", "class advisor", "mentor", "class tutor"],
  academicAdvisor: ["academic advisor", "program advisor", "hod", "head of department"],
  currentStatus: ["status", "current status", "student status"],
  cgpa: ["cgpa", "cumulative gpa", "overall gpa", "overall cgpa"],
  latestSgpa: ["latest sgpa", "sgpa", "current sgpa", "semester gpa"],
  creditsEarned: ["earned credits", "credits earned", "earned", "total earned"],
  creditsRegistered: ["total credits", "credits registered", "registered", "attempted credits"],
  hostelStatus: ["hostel status", "accommodation status", "hosteller/dayscholar"],
  hostelName: ["hostel name", "hostel", "hostel block name"],
} as const;

export function parseDashboard(html: string): DashboardData {
  const $ = cheerio.load(html);
  const now = new Date().toISOString();

  saveDebugSnapshot(html, "dashboard").catch(() => {});

  const kv = buildKvMapFromTables($);
  const lookup = (candidates: string[]): string => lookupKv(kv, candidates);

  const studentName = lookup(DASHBOARD_KV_SELECTORS.studentName);
  const studentId = lookup(DASHBOARD_KV_SELECTORS.studentId) || lookup(DASHBOARD_KV_SELECTORS.registerNumber);
  const registerNumber = lookup(DASHBOARD_KV_SELECTORS.registerNumber);
  const email = lookup(DASHBOARD_KV_SELECTORS.email);
  const institution = lookup(DASHBOARD_KV_SELECTORS.institution);
  const program = lookup(DASHBOARD_KV_SELECTORS.program);
  const semesterRaw = lookup(DASHBOARD_KV_SELECTORS.semester);
  const semester = Math.max(1, parseNum(semesterRaw, 1) | 0);
  const batch = lookup(DASHBOARD_KV_SELECTORS.batch);
  const section = lookup(DASHBOARD_KV_SELECTORS.section);
  const roomNo = lookup(DASHBOARD_KV_SELECTORS.roomNo) || undefined;
  const facultyAdvisor = lookup(DASHBOARD_KV_SELECTORS.facultyAdvisor) || undefined;
  const academicAdvisor = lookup(DASHBOARD_KV_SELECTORS.academicAdvisor) || undefined;
  const currentStatus = lookup(DASHBOARD_KV_SELECTORS.currentStatus) || "Active";

  const cgpa = parseNum(lookup(DASHBOARD_KV_SELECTORS.cgpa), 0);
  const latestSgpaRaw = parseNum(lookup(DASHBOARD_KV_SELECTORS.latestSgpa), 0);
  const latestSgpa = latestSgpaRaw > 0 ? latestSgpaRaw : undefined;
  const creditsEarned = parseNum(lookup(DASHBOARD_KV_SELECTORS.creditsEarned), 0);
  const creditsRegistered = parseNum(lookup(DASHBOARD_KV_SELECTORS.creditsRegistered), 0);

  const hostelStatusRaw = lookup(DASHBOARD_KV_SELECTORS.hostelStatus);
  const hostelNameRaw = lookup(DASHBOARD_KV_SELECTORS.hostelName);

  let hostelStatus: string | undefined;
  if (hostelStatusRaw) hostelStatus = hostelStatusRaw;
  else if (roomNo || hostelNameRaw) hostelStatus = "Hosteller";
  else hostelStatus = undefined;

  const hasHostelRoom = roomNo || hostelNameRaw;
  const hostelRoomDetails = hasHostelRoom
    ? {
        hostelName: hostelNameRaw || undefined,
        roomNo: roomNo || undefined,
      }
    : undefined;

  const upcomingExams: UpcomingExam[] = parseUpcomingExamsFromPage($);
  const notices = parseNoticesFromPage($);

  const result: DashboardData = {
    sourceTimestamp: now,
    lastSynced: now,
    studentName: studentName || "",
    studentId: studentId || registerNumber || "",
    registerNumber: registerNumber || "",
    email: email || "",
    institution: institution || "",
    program: program || "",
    semester,
    batch: batch || "",
    section: section || "",
    roomNo,
    facultyAdvisor,
    academicAdvisor,
    currentStatus,
    cgpa,
    latestSgpa,
    creditsEarned,
    creditsRegistered,
    hostelStatus,
    hostelRoomDetails,
    upcomingExams,
    notices,
  };

  return result;
}

function parseUpcomingExamsFromPage($: cheerio.CheerioAPI): UpcomingExam[] {
  const results: UpcomingExam[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  $("table").each((_, tblEl) => {
    const $table = $(tblEl);
    const headers = findTableHeaders($, undefined as any);
    const headersText = headers.join(" ").toLowerCase();
    const isExamTable =
      headersText.includes("exam") ||
      headersText.includes("date") ||
      headersText.includes("venue") ||
      headersText.includes("course") ||
      headersText.includes("subject") ||
      headersText.includes("session");

    if (!isExamTable) return;

    const courseCodeIdx = matchColumnIndex(headers, ["course code", "subject code", "code", "paper code"]);
    const courseNameIdx = matchColumnIndex(headers, ["course name", "subject name", "subject", "course", "paper name", "description", "title"]);
    const dateIdx = matchColumnIndex(headers, ["exam date", "date", "day & date", "day and date"]);
    const sessionIdx = matchColumnIndex(headers, ["session", "forenoon/afternoon", "fn/an", "timing"]);
    const venueIdx = matchColumnIndex(headers, ["venue", "hall", "room", "exam hall", "centre", "center"]);
    const seatIdx = matchColumnIndex(headers, ["seat no", "seat number", "hall ticket no", "roll no in exam"]);
    const semesterIdx = matchColumnIndex(headers, ["semester", "sem"]);
    const timeIdx = matchColumnIndex(headers, ["time", "duration", "reporting time"]);

    if (courseCodeIdx < 0 && courseNameIdx < 0 && dateIdx < 0) return;

    $table.find("tr").each((_, rEl) => {
      const $r = $(rEl);
      if ($r.find("th").length > 0) return;
      const $tds = $r.find("td");
      if ($tds.length < 3) return;

      const cell = (idx: number): string => {
        if (idx < 0 || idx >= $tds.length) return "";
        return selectText($($tds[idx]));
      };

      const courseCode = cell(courseCodeIdx);
      const courseName = cell(courseNameIdx);
      const examDateRaw = cell(dateIdx);
      if (!courseCode && !courseName) return;
      if (!examDateRaw) return;

      const examDate = parseDateDMYorMDY(examDateRaw) || examDateRaw;
      const session = cell(sessionIdx) || "FN";
      const venue = cell(venueIdx);
      const seatNumber = cell(seatIdx) || undefined;
      const time = cell(timeIdx) || undefined;
      const examSemester =
        semesterIdx >= 0 ? parseNum(cell(semesterIdx), 0) || 1 : 1;

      let daysUntil = 0;
      try {
        const examDt = new Date(examDate);
        if (!isNaN(examDt.getTime())) {
          const diff = examDt.getTime() - today.getTime();
          daysUntil = Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
        }
      } catch {
        // ignore
      }

      results.push({
        semester: examSemester,
        courseCode,
        courseName: courseName || courseCode,
        examDate,
        session,
        venue: venue || "TBD",
        seatNumber,
        time,
        examType: "EXTERNAL",
        daysUntil,
      });
    });
  });

  const nowMs = Date.now();
  results.sort((a, b) => {
    try {
      return new Date(a.examDate).getTime() - new Date(b.examDate).getTime();
    } catch {
      return 0;
    }
  });

  return results.slice(0, 10);
}

function parseNoticesFromPage(
  $: cheerio.CheerioAPI
): Array<{ id: string; title: string; date: string; category?: string; content?: string }> {
  const results: Array<{
    id: string;
    title: string;
    date: string;
    category?: string;
    content?: string;
  }> = [];

  const noticeContainers = [
    "#notices",
    ".notices",
    ".dashboard-notices",
    ".announcements",
    ".notice-board",
    ".news",
    ".updates",
  ];

  let found = false;
  for (const sel of noticeContainers) {
    const $container = $(sel).first();
    if ($container.length === 0) continue;

    $container.find("li, tr, .notice-item, .notice-row, .news-item, .announcement-item").each(
      (idx, el) => {
        const $el = $(el);
        if ($el.find("th").length > 0) return;

        const text = normalizeWs($el.text());
        if (!text || text.length < 5) return;

        const dateMatch = text.match(
          /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|[A-Za-z]{3}\s+\d{1,2},?\s+\d{4})/
        );
        const date = dateMatch
          ? parseDateDMYorMDY(dateMatch[1]) || dateMatch[1]
          : "";

        const title = date
          ? normalizeWs(text.replace(dateMatch[0], "")).replace(/^[\s\-|:,]+/, "").slice(0, 200)
          : text.slice(0, 200);

        if (!title) return;

        results.push({
          id: `notice-${idx}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          title,
          date: date || new Date().toISOString().split("T")[0],
          category: "General",
        });
        found = true;
      }
    );
    if (found) break;
  }

  if (results.length === 0) {
    $("a").each((idx, aEl) => {
      const $a = $(aEl);
      const href = $a.attr("href") || "";
      const text = normalizeWs($a.text());
      if (
        text.length >= 10 &&
        text.length <= 200 &&
        (href.toLowerCase().includes("notice") ||
          href.toLowerCase().includes("announcement") ||
          href.toLowerCase().includes("news") ||
          href.toLowerCase().includes("circular"))
      ) {
        results.push({
          id: `notice-link-${idx}`,
          title: text,
          date: new Date().toISOString().split("T")[0],
          category: "General",
        });
      }
    });
  }

  return results.slice(0, 10);
}
