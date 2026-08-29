export interface SRMSession {
  sessionId: string;
  state: 'CAPTCHA_REQUIRED' | 'AUTHENTICATION_IN_PROGRESS' | 'AUTHENTICATED' | 'AUTH_FAILED' | 'SESSION_LOST' | 'EXPIRED' | 'LOGGED_OUT' | 'AUTHENTICATION_UNKNOWN' | 'INVALID_CAPTCHA' | 'CAPTCHA_EXPIRED' | 'INVALID_CREDENTIALS' | 'SRM_UNAVAILABLE';
  authenticated: boolean;
  createdAt: number;
  lastActivityAt: number;
  loginInProgress?: boolean;
  captchaGeneratedAt?: number;
  captchaAgeMs?: number;
}

export interface StudentProfile {
  name: string;
  studentId: string;
  registerNumber: string;
  email: string;
  institution: string;
  program: string;
  semester: string;
  batch: string;
  section: string;
  facultyAdvisor: string;
  status: string;
}

export interface AttendanceSubject {
  code: string;
  name: string;
  classesHeld: number;
  classesAttended: number;
  percentage: number;
}

export interface GradeEntry {
  courseCode: string;
  courseName: string;
  internalMarks?: number;
  externalMarks?: number;
  total?: number;
  grade: string;
  credits: number;
  gradePoint?: number;
}

export interface TimetableEntry {
  day: string;
  period: string;
  courseCode: string;
  courseName: string;
  faculty: string;
  room: string;
}

export interface ExamResultEntry {
  courseCode: string;
  courseName: string;
  semester: string;
  internalMarks: string;
  externalMarks: string;
  total: string;
  result: string;
  grade: string;
}

export type SrmErrorCode =
  | 'INVALID_CAPTCHA'
  | 'INVALID_CREDENTIALS'
  | 'SRM_UNAVAILABLE'
  | 'SESSION_EXPIRED'
  | 'NOT_AVAILABLE'
  | 'INTERNAL_ERROR'
  | 'CAPTCHA_EXPIRED'
  | 'AUTHENTICATION_UNKNOWN';