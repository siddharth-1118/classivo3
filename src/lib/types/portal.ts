export interface LoginError {
  type: "captcha" | "credentials" | "portal" | "network" | "session";
  message: string;
  code?:
    | "INVALID_CAPTCHA"
    | "INVALID_CREDENTIALS"
    | "SESSION_EXPIRED"
    | "PORTAL_UNAVAILABLE"
    | "CONSENT_REQUIRED"
    | "VALIDATION_ERROR"
    | "UNAUTHORIZED"
    | "RATE_LIMITED"
    | "INTERNAL_ERROR"
    | "PARSE_FAILED";
}

export interface GradeRow {
  semester: number;
  examMonthYear: string;
  code: string;
  title: string;
  credit: number;
  grade: string;
}

export interface GradesSummary {
  cgpa: number;
  creditsRegistered: number;
  creditsEarned: number;
  creditsRequired: number;
}

export interface GradesData {
  sourceTimestamp: string;
  grades: GradeRow[];
  summary: GradesSummary;
  semesters: Array<{
    semester: number;
    sgpa: number;
    academicYear: string;
    totalCredits: number;
    earnedCredits: number;
  }>;
}

export interface HostelInfo {
  academicYear: string;
  hostelName: string;
  roomNo: string;
  allotmentDate: string;
  feeAmount: number;
  payMode: string;
  admitCardAvailable: boolean;
  declarationFormAvailable: boolean;
}

export interface HostelAllotment {
  academicYear: string;
  hostelName: string;
  roomNo: string;
  block?: string;
  floor?: string;
  bedNo?: string;
  allotmentDate: string;
  roomType?: string;
  messPreference?: string;
  status: string;
  bookingStage?: string;
}

export interface HostelPayment {
  academicYear: string;
  feeAmount: number;
  feeDescription: string;
  payMode: string;
  transactionId?: string;
  paymentDate?: string;
  dueDate?: string;
  status: "Paid" | "Unpaid" | "Partial";
  receiptNumber?: string;
}

export interface HostelBooking {
  academicYear: string;
  applicationDate?: string;
  preferredHostel?: string;
  preferredRoomType?: string;
  status: string;
  bookingStage?: string;
  allotment?: HostelAllotment;
}

export interface HostelData {
  sourceTimestamp: string;
  hostel: HostelInfo;
  booking?: HostelBooking;
  payments: HostelPayment[];
  allotments: HostelAllotment[];
  admitCardAvailable: boolean;
  declarationFormAvailable: boolean;
}

export interface ExamEntry {
  examTitle?: string;
  program?: string;
  semester: number;
  courseCode: string;
  courseName: string;
  examDate: string;
  session: string;
  venue: string;
  seatNumber?: string;
  time?: string;
  remarks?: string;
  examType?: "INTERNAL" | "EXTERNAL" | "PRACTICAL" | "VIVA" | string;
}

export interface ExamTimetableData {
  sourceTimestamp: string;
  lastUpdated: string;
  academicYear: string;
  semester: number;
  examinationName: string;
  program?: string;
  timetable: ExamEntry[];
  instructions: string[];
}

export interface UpcomingExam extends ExamEntry {
  daysUntil: number;
}

export interface DashboardData {
  sourceTimestamp: string;
  lastSynced: string;
  studentName: string;
  studentId: string;
  registerNumber: string;
  email: string;
  institution: string;
  program: string;
  semester: number;
  batch: string;
  section: string;
  roomNo?: string;
  facultyAdvisor?: string;
  academicAdvisor?: string;
  currentStatus: string;
  cgpa: number;
  latestSgpa?: number;
  creditsEarned: number;
  creditsRegistered: number;
  hostelStatus?: "Hosteller" | "Dayscholar" | string;
  hostelRoomDetails?: {
    hostelName?: string;
    roomNo?: string;
    block?: string;
    floor?: string;
    bedNo?: string;
  };
  upcomingExams: UpcomingExam[];
  notices: Array<{
    id: string;
    title: string;
    date: string;
    category?: string;
    content?: string;
  }>;
}

export interface ProfileData {
  sourceTimestamp: string;
  studentName: string;
  studentId: string;
  registerNo: string;
  emailId: string;
  alternateEmail?: string;
  mobile?: string;
  alternateMobile?: string;
  institution: string;
  program: string;
  semester: number;
  batch: string;
  section: string;
  roomNo?: string;
  enrollmentDate?: string;
  currentSemCourseEnrollmentDate?: string;
  facultyAdvisor?: string;
  academicAdvisor?: string;
  currentStatus: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  nationality?: string;
  photoUrl?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  parentDetails?: {
    fatherName?: string;
    motherName?: string;
    guardianName?: string;
    fatherContact?: string;
    motherContact?: string;
    guardianContact?: string;
  };
  academicInfo?: {
    specialization?: string;
    department?: string;
    academicYear?: string;
    rollNumber?: string;
    scheme?: string;
    admissionMode?: string;
    admissionDate?: string;
  };
}

export interface PortalLoginSession {
  sessionToken: string;
  cookies: Record<string, string>;
  createdAt: number;
  hiddenFields?: Record<string, string>;
  captchaAnswer?: string;
  _cookieJarSer?: unknown;
  netId?: string;
}

export interface PortalAuthenticatedSession {
  loginSession: PortalLoginSession;
  netId: string;
  name: string;
  regNo: string;
  authenticatedAt: number;
  expiresAt: number;
  consentGrantedAt?: number;
  cachedData?: {
    dashboard?: DashboardData;
    profile?: ProfileData;
    grades?: GradesData;
    hostel?: HostelData;
    exams?: ExamTimetableData;
    cachedAt?: number;
  };
}

export type ApiErrorCode =
  | "INVALID_CAPTCHA"
  | "INVALID_CREDENTIALS"
  | "SESSION_EXPIRED"
  | "PORTAL_UNAVAILABLE"
  | "CONSENT_REQUIRED"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "PARSE_FAILED";

export interface ApiErrorResponse {
  ok: false;
  error: ApiErrorCode;
  message: string;
  details?: unknown;
}

export interface ApiSuccessResponse<T = unknown> {
  ok: true;
  data?: T;
}

export interface StudentPortalProvider {
  initLoginSession(): Promise<{ captchaUrl: string; requestId?: string; session: PortalLoginSession }>;
  refreshCaptcha(
    existingSession?: PortalLoginSession,
  ): Promise<{ captchaUrl: string; requestId?: string; session: PortalLoginSession }>;
  login(params: {
    session: PortalLoginSession;
    netid: string;
    password: string;
    captcha: string;
  }): Promise<{
    success: boolean;
    errorCode?: "INVALID_CAPTCHA" | "INVALID_CREDENTIALS" | "PORTAL_UNAVAILABLE" | "SESSION_EXPIRED";
    errorMessage?: string;
  }>;
  logout(session: PortalLoginSession): Promise<void>;
  getDashboard(session: PortalLoginSession): Promise<DashboardData>;
  getProfile(session: PortalLoginSession): Promise<ProfileData>;
  getGrades(session: PortalLoginSession): Promise<GradesData>;
  getHostel(session: PortalLoginSession): Promise<HostelData>;
  getExamTimetable(session: PortalLoginSession): Promise<ExamTimetableData>;
}