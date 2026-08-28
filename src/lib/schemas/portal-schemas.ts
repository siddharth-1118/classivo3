import { z } from "zod";
import type {
  GradeRow,
  GradesSummary,
  GradesData,
  HostelInfo,
  HostelAllotment,
  HostelPayment,
  HostelBooking,
  HostelData,
  ExamEntry,
  ExamTimetableData,
  UpcomingExam,
  DashboardData,
  ProfileData,
  PortalLoginSession,
  PortalAuthenticatedSession,
} from "@/lib/types/portal";

export const GradeRowSchema = z.object({
  semester: z.number().int().min(1).max(12),
  examMonthYear: z.string(),
  code: z.string(),
  title: z.string(),
  credit: z.number().min(0),
  grade: z.string(),
});

export const GradesSummarySchema = z.object({
  cgpa: z.number().min(0).max(10),
  creditsRegistered: z.number().min(0),
  creditsEarned: z.number().min(0),
  creditsRequired: z.number().min(0),
});

export const SemesterEntrySchema = z.object({
  semester: z.number().int().min(1).max(12),
  sgpa: z.number().min(0).max(10),
  academicYear: z.string(),
  totalCredits: z.number().min(0),
  earnedCredits: z.number().min(0),
});

export const GradesDataSchema = z.object({
  sourceTimestamp: z.string().datetime(),
  grades: z.array(GradeRowSchema),
  summary: GradesSummarySchema,
  semesters: z.array(SemesterEntrySchema),
});

export const HostelInfoSchema = z.object({
  academicYear: z.string(),
  hostelName: z.string(),
  roomNo: z.string(),
  allotmentDate: z.string(),
  feeAmount: z.number().min(0),
  payMode: z.string(),
  admitCardAvailable: z.boolean(),
  declarationFormAvailable: z.boolean(),
});

export const HostelAllotmentSchema = z.object({
  academicYear: z.string(),
  hostelName: z.string(),
  roomNo: z.string(),
  block: z.string().optional(),
  floor: z.string().optional(),
  bedNo: z.string().optional(),
  allotmentDate: z.string(),
  roomType: z.string().optional(),
  messPreference: z.string().optional(),
  status: z.string(),
  bookingStage: z.string().optional(),
});

export const HostelPaymentSchema = z.object({
  academicYear: z.string(),
  feeAmount: z.number().min(0),
  feeDescription: z.string(),
  payMode: z.string(),
  transactionId: z.string().optional(),
  paymentDate: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["Paid", "Unpaid", "Partial"]),
  receiptNumber: z.string().optional(),
});

export const HostelBookingSchema = z.object({
  academicYear: z.string(),
  applicationDate: z.string().optional(),
  preferredHostel: z.string().optional(),
  preferredRoomType: z.string().optional(),
  status: z.string(),
  bookingStage: z.string().optional(),
  allotment: HostelAllotmentSchema.optional(),
});

export const HostelDataSchema = z.object({
  sourceTimestamp: z.string().datetime(),
  hostel: HostelInfoSchema,
  booking: HostelBookingSchema.optional(),
  payments: z.array(HostelPaymentSchema),
  allotments: z.array(HostelAllotmentSchema),
  admitCardAvailable: z.boolean(),
  declarationFormAvailable: z.boolean(),
});

export const ExamEntrySchema = z.object({
  examTitle: z.string().optional(),
  program: z.string().optional(),
  semester: z.number().int().min(1).max(12),
  courseCode: z.string(),
  courseName: z.string(),
  examDate: z.string(),
  session: z.string(),
  venue: z.string(),
  seatNumber: z.string().optional(),
  time: z.string().optional(),
  remarks: z.string().optional(),
  examType: z.string().optional(),
});

export const ExamTimetableDataSchema = z.object({
  sourceTimestamp: z.string().datetime(),
  lastUpdated: z.string(),
  academicYear: z.string(),
  semester: z.number().int().min(1).max(12),
  examinationName: z.string(),
  program: z.string().optional(),
  timetable: z.array(ExamEntrySchema),
  instructions: z.array(z.string()),
});

export const UpcomingExamSchema = ExamEntrySchema.extend({
  daysUntil: z.number().int().min(0),
});

export const HostelRoomDetailsSchema = z.object({
  hostelName: z.string().optional(),
  roomNo: z.string().optional(),
  block: z.string().optional(),
  floor: z.string().optional(),
  bedNo: z.string().optional(),
});

export const DashboardNoticeSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  category: z.string().optional(),
  content: z.string().optional(),
});

export const DashboardDataSchema = z.object({
  sourceTimestamp: z.string().datetime(),
  lastSynced: z.string(),
  studentName: z.string(),
  studentId: z.string(),
  registerNumber: z.string(),
  email: z.string().email(),
  institution: z.string(),
  program: z.string(),
  semester: z.number().int().min(1).max(12),
  batch: z.string(),
  section: z.string(),
  roomNo: z.string().optional(),
  facultyAdvisor: z.string().optional(),
  academicAdvisor: z.string().optional(),
  currentStatus: z.string(),
  cgpa: z.number().min(0).max(10),
  latestSgpa: z.number().min(0).max(10).optional(),
  creditsEarned: z.number().min(0),
  creditsRegistered: z.number().min(0),
  hostelStatus: z.string().optional(),
  hostelRoomDetails: HostelRoomDetailsSchema.optional(),
  upcomingExams: z.array(UpcomingExamSchema),
  notices: z.array(DashboardNoticeSchema),
});

export const AddressSchema = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  country: z.string().optional(),
});

export const ParentDetailsSchema = z.object({
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  guardianName: z.string().optional(),
  fatherContact: z.string().optional(),
  motherContact: z.string().optional(),
  guardianContact: z.string().optional(),
});

export const AcademicInfoSchema = z.object({
  specialization: z.string().optional(),
  department: z.string().optional(),
  academicYear: z.string().optional(),
  rollNumber: z.string().optional(),
  scheme: z.string().optional(),
  admissionMode: z.string().optional(),
  admissionDate: z.string().optional(),
});

export const ProfileDataSchema = z.object({
  sourceTimestamp: z.string().datetime(),
  studentName: z.string(),
  studentId: z.string(),
  registerNo: z.string(),
  emailId: z.string().email(),
  alternateEmail: z.string().email().optional(),
  mobile: z.string().optional(),
  alternateMobile: z.string().optional(),
  institution: z.string(),
  program: z.string(),
  semester: z.number().int().min(1).max(12),
  batch: z.string(),
  section: z.string(),
  roomNo: z.string().optional(),
  enrollmentDate: z.string().optional(),
  currentSemCourseEnrollmentDate: z.string().optional(),
  facultyAdvisor: z.string().optional(),
  academicAdvisor: z.string().optional(),
  currentStatus: z.string(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  nationality: z.string().optional(),
  photoUrl: z.string().optional(),
  address: AddressSchema.optional(),
  parentDetails: ParentDetailsSchema.optional(),
  academicInfo: AcademicInfoSchema.optional(),
});

export const PortalLoginSessionSchema = z.object({
  sessionToken: z.string(),
  cookies: z.record(z.string(), z.string()),
  createdAt: z.number().int().min(0),
  hiddenFields: z.record(z.string(), z.string()).optional(),
  captchaAnswer: z.string().optional(),
  _cookieJarSer: z.unknown().optional(),
  netId: z.string().optional(),
  domainFieldName: z.string().optional(),
  captchaFieldName: z.string().optional(),
  randomDelimiter: z.string().optional(),
});

export const CachedDataSchema = z.object({
  dashboard: DashboardDataSchema.optional(),
  profile: ProfileDataSchema.optional(),
  grades: GradesDataSchema.optional(),
  hostel: HostelDataSchema.optional(),
  exams: ExamTimetableDataSchema.optional(),
  cachedAt: z.number().int().min(0).optional(),
});

export const PortalAuthenticatedSessionSchema = z.object({
  loginSession: PortalLoginSessionSchema,
  netId: z.string(),
  name: z.string(),
  regNo: z.string(),
  authenticatedAt: z.number().int().min(0),
  expiresAt: z.number().int().min(0),
  consentGrantedAt: z.number().int().min(0).optional(),
  cachedData: CachedDataSchema.optional(),
});

export function safeParseGradeRow(data: unknown): GradeRow {
  const result = GradeRowSchema.safeParse(data);
  if (result.success) return result.data;
  return {
    semester: 1,
    examMonthYear: "",
    code: "",
    title: "",
    credit: 0,
    grade: "",
  };
}

export function safeParseGradesData(data: unknown): GradesData {
  const result = GradesDataSchema.safeParse(data);
  if (result.success) return result.data;
  const now = new Date().toISOString();
  return {
    sourceTimestamp: now,
    grades: [],
    summary: {
      cgpa: 0,
      creditsRegistered: 0,
      creditsEarned: 0,
      creditsRequired: 0,
    },
    semesters: [],
  };
}

export function safeParseHostelInfo(data: unknown): HostelInfo {
  const result = HostelInfoSchema.safeParse(data);
  if (result.success) return result.data;
  return {
    academicYear: "",
    hostelName: "",
    roomNo: "",
    allotmentDate: "",
    feeAmount: 0,
    payMode: "",
    admitCardAvailable: false,
    declarationFormAvailable: false,
  };
}

export function safeParseHostelAllotment(data: unknown): HostelAllotment {
  const result = HostelAllotmentSchema.safeParse(data);
  if (result.success) return result.data;
  return {
    academicYear: "",
    hostelName: "",
    roomNo: "",
    allotmentDate: "",
    status: "",
  };
}

export function safeParseHostelPayment(data: unknown): HostelPayment {
  const result = HostelPaymentSchema.safeParse(data);
  if (result.success) return result.data;
  return {
    academicYear: "",
    feeAmount: 0,
    feeDescription: "",
    payMode: "",
    status: "Unpaid",
  };
}

export function safeParseHostelBooking(data: unknown): HostelBooking | undefined {
  const result = HostelBookingSchema.safeParse(data);
  if (result.success) return result.data;
  return undefined;
}

export function safeParseHostelData(data: unknown): HostelData {
  const result = HostelDataSchema.safeParse(data);
  if (result.success) return result.data;
  const now = new Date().toISOString();
  return {
    sourceTimestamp: now,
    hostel: safeParseHostelInfo({}),
    payments: [],
    allotments: [],
    admitCardAvailable: false,
    declarationFormAvailable: false,
  };
}

export function safeParseExamEntry(data: unknown): ExamEntry {
  const result = ExamEntrySchema.safeParse(data);
  if (result.success) return result.data;
  return {
    semester: 1,
    courseCode: "",
    courseName: "",
    examDate: "",
    session: "",
    venue: "",
  };
}

export function safeParseExamTimetableData(data: unknown): ExamTimetableData {
  const result = ExamTimetableDataSchema.safeParse(data);
  if (result.success) return result.data;
  const now = new Date().toISOString();
  return {
    sourceTimestamp: now,
    lastUpdated: now,
    academicYear: "",
    semester: 1,
    examinationName: "",
    timetable: [],
    instructions: [],
  };
}

export function safeParseDashboardData(data: unknown): DashboardData {
  const result = DashboardDataSchema.safeParse(data);
  if (result.success) return result.data;
  const now = new Date().toISOString();
  return {
    sourceTimestamp: now,
    lastSynced: now,
    studentName: "",
    studentId: "",
    registerNumber: "",
    email: "",
    institution: "",
    program: "",
    semester: 1,
    batch: "",
    section: "",
    currentStatus: "",
    cgpa: 0,
    creditsEarned: 0,
    creditsRegistered: 0,
    upcomingExams: [],
    notices: [],
  };
}

export function safeParseProfileData(data: unknown): ProfileData {
  const result = ProfileDataSchema.safeParse(data);
  if (result.success) return result.data;
  const now = new Date().toISOString();
  return {
    sourceTimestamp: now,
    studentName: "",
    studentId: "",
    registerNo: "",
    emailId: "",
    institution: "",
    program: "",
    semester: 1,
    batch: "",
    section: "",
    currentStatus: "",
  };
}

export function safeParsePortalLoginSession(data: unknown): PortalLoginSession {
  const result = PortalLoginSessionSchema.safeParse(data);
  if (result.success) return result.data;
  return {
    sessionToken: "",
    cookies: {},
    createdAt: Date.now(),
  };
}

export function safeParsePortalAuthenticatedSession(data: unknown): PortalAuthenticatedSession | null {
  const result = PortalAuthenticatedSessionSchema.safeParse(data);
  if (result.success) return result.data;
  return null;
}
