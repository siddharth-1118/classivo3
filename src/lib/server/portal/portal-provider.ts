import type {
  PortalLoginSession,
  DashboardData,
  ProfileData,
  GradesData,
  HostelData,
  ExamTimetableData,
} from "@/lib/types/portal";

export type LoginErrorCode =
  | "INVALID_CAPTCHA"
  | "INVALID_CREDENTIALS"
  | "SESSION_EXPIRED"
  | "PORTAL_UNAVAILABLE"
  | "PARSE_FAILED";

export interface StudentPortalProvider {
  initLoginSession(): Promise<{
    requestId: string;
    captchaUrl: string;
    session: PortalLoginSession;
  }>;

  refreshCaptcha(
    requestId: string,
  ): Promise<{
    requestId: string;
    captchaUrl: string;
    session: PortalLoginSession;
  }>;

  login(input: {
    netid: string;
    password: string;
    captcha: string;
    requestId: string;
  }): Promise<{
    success: boolean;
    errorCode?: LoginErrorCode;
    errorMessage?: string;
  }>;

  getAuthenticatedDashboard(session: PortalLoginSession): Promise<DashboardData>;

  getAuthenticatedProfile(session: PortalLoginSession): Promise<ProfileData>;

  getAuthenticatedGrades(session: PortalLoginSession): Promise<GradesData>;

  getAuthenticatedHostel(session: PortalLoginSession): Promise<HostelData>;

  getAuthenticatedExamTimetable(
    session: PortalLoginSession,
  ): Promise<ExamTimetableData>;

  logout(session: PortalLoginSession): Promise<void>;
}
