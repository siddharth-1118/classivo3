"use client";

import * as React from "react";
import type {
  DashboardData,
  ProfileData,
  GradesData,
  HostelData,
  ExamTimetableData,
  LoginError,
} from "@/lib/types/portal";

const STORAGE_KEYS = {
  SESSION_ID: "student_portal_session_id",
  STUDENT_NAME: "student_portal_student_name",
  STUDENT_INFO: "student_portal_student_info",
} as const;

const API_BASE = "/api/portal";

export interface UsePortalClientReturn {
  sessionId: string | null;
  studentName: string | null;
  loading: boolean;
  error: string | null;
  lastError: LoginError | null;
  login: (params: {
    username: string;
    password: string;
    captcha: string;
    requestId: string;
    consent: boolean;
  }) => Promise<{ success: boolean; error?: LoginError }>;
  logout: () => Promise<void>;
  getDashboard: () => Promise<DashboardData | null>;
  getProfile: () => Promise<ProfileData | null>;
  getGrades: () => Promise<GradesData | null>;
  getHostel: () => Promise<HostelData | null>;
  getExams: () => Promise<ExamTimetableData | null>;
  refreshAll: () => Promise<{
    dashboard: DashboardData | null;
    profile: ProfileData | null;
    grades: GradesData | null;
    hostel: HostelData | null;
    exams: ExamTimetableData | null;
  }>;
  getCaptcha: () => Promise<{ captchaUrl: string; requestId: string }>;
  refreshCaptcha: (requestId: string) => Promise<{ captchaUrl: string; requestId: string }>;
  clearError: () => void;
  exportGrades: () => Promise<void>;
}

async function fetchJSON<T>(
  url: string,
  options: RequestInit = {},
  sessionId: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (sessionId) headers["Authorization"] = `Bearer ${sessionId}`;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  const text = await response.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  const { ok, error, message, data: responseData } = data;

  if (response.status === 401) {
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
      localStorage.removeItem(STORAGE_KEYS.STUDENT_NAME);
      localStorage.removeItem(STORAGE_KEYS.STUDENT_INFO);
    } catch {}
    throw new Error(message || error || "Unauthorized");
  }

  if (ok === false || !response.ok) {
    const errMsg = message || error || `HTTP ${response.status}`;
    throw new Error(typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg));
  }

  return (responseData !== undefined ? responseData : data) as T;
}

function mapErrorToLoginError(errorMessage: string, errorCode?: string): LoginError {
  let type: LoginError["type"] = "portal";
  let code: LoginError["code"] | undefined;

  if (errorCode === "INVALID_CAPTCHA") {
    type = "captcha";
    code = "INVALID_CAPTCHA";
  } else if (errorCode === "INVALID_CREDENTIALS") {
    type = "credentials";
    code = "INVALID_CREDENTIALS";
  } else if (errorCode === "SESSION_EXPIRED") {
    type = "session";
    code = "SESSION_EXPIRED";
  } else if (errorCode === "PORTAL_UNAVAILABLE") {
    type = "portal";
    code = "PORTAL_UNAVAILABLE";
  } else if (errorCode === "CONSENT_REQUIRED") {
    type = "portal";
    code = "CONSENT_REQUIRED";
  } else if (errorCode === "VALIDATION_ERROR") {
    type = "portal";
    code = "VALIDATION_ERROR";
  } else if (errorCode === "UNAUTHORIZED") {
    type = "session";
    code = "UNAUTHORIZED";
  } else if (errorCode === "RATE_LIMITED") {
    type = "portal";
    code = "RATE_LIMITED";
  } else if (errorCode === "INTERNAL_ERROR") {
    type = "portal";
    code = "INTERNAL_ERROR";
  }

  const lowerMsg = errorMessage.toLowerCase();
  if (lowerMsg.includes("captcha")) {
    type = "captcha";
    if (!code) code = "INVALID_CAPTCHA";
  } else if (lowerMsg.includes("password") || lowerMsg.includes("credential") || lowerMsg.includes("invalid") && lowerMsg.includes("netid")) {
    type = "credentials";
    if (!code) code = "INVALID_CREDENTIALS";
  } else if (lowerMsg.includes("network") || lowerMsg.includes("connect") || lowerMsg.includes("fetch")) {
    type = "network";
  } else if (lowerMsg.includes("session") || lowerMsg.includes("expired")) {
    type = "session";
    if (!code) code = "SESSION_EXPIRED";
  }

  return {
    type,
    message: errorMessage,
    code,
  };
}

export function usePortalClient(): UsePortalClientReturn {
  const [sessionId, setSessionIdState] = React.useState<string | null>(null);
  const [studentName, setStudentNameState] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastError, setLastError] = React.useState<LoginError | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
      const n = localStorage.getItem(STORAGE_KEYS.STUDENT_NAME);
      if (s) setSessionIdState(s);
      if (n) setStudentNameState(n);
    } catch {}
    setHydrated(true);
  }, []);

  const setSessionId = React.useCallback((id: string | null) => {
    setSessionIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEYS.SESSION_ID, id);
      else localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
    } catch {}
  }, []);

  const setStudentName = React.useCallback((name: string | null) => {
    setStudentNameState(name);
    try {
      if (name) localStorage.setItem(STORAGE_KEYS.STUDENT_NAME, name);
      else localStorage.removeItem(STORAGE_KEYS.STUDENT_NAME);
    } catch {}
  }, []);

  const setStudentInfo = React.useCallback((info: Record<string, unknown> | null) => {
    try {
      if (info) localStorage.setItem(STORAGE_KEYS.STUDENT_INFO, JSON.stringify(info));
      else localStorage.removeItem(STORAGE_KEYS.STUDENT_INFO);
    } catch {}
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
    setLastError(null);
  }, []);

  const handle401 = React.useCallback(() => {
    setSessionId(null);
    setStudentName(null);
    setStudentInfo(null);
    try {
      localStorage.removeItem("srm_app_user");
    } catch {}
  }, [setSessionId, setStudentName, setStudentInfo]);

  const withLoading = React.useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      setLoading(true);
      setError(null);
      try {
        return await fn();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "An error occurred";
        setError(msg);
        if (msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("401")) {
          handle401();
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [handle401]
  );

  const getCaptcha = React.useCallback(async () => {
    setLoading(true);
    clearError();
    try {
      const data = await fetchJSON<{ captchaUrl: string; requestId: string }>(
        `${API_BASE}/captcha`,
        { method: "GET" },
        null
      );
      return {
        captchaUrl: data.captchaUrl,
        requestId: data.requestId,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load captcha";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [clearError]);

  const refreshCaptcha = React.useCallback(async (requestId: string) => {
    setLoading(true);
    clearError();
    try {
      const data = await fetchJSON<{ captchaUrl: string; requestId: string }>(
        `${API_BASE}/refresh-captcha`,
        {
          method: "POST",
          body: JSON.stringify({ requestId }),
        },
        null
      );
      return {
        captchaUrl: data.captchaUrl,
        requestId: data.requestId,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to refresh captcha";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [clearError]);

  const login = React.useCallback(
    async (params: {
      username: string;
      password: string;
      captcha: string;
      requestId: string;
      consent: boolean;
    }) => {
      clearError();
      setLoading(true);
      try {
        const data = await fetchJSON<{
          success: boolean;
          sessionId?: string;
          studentName?: string;
          studentInfo?: Record<string, unknown>;
          error?: string;
          errorCode?: string;
          message?: string;
        }>(
          `${API_BASE}/login`,
          {
            method: "POST",
            body: JSON.stringify(params),
          },
          null
        );

        if (data.success || (data as { connected?: boolean }).connected) {
          setSessionId(data.sessionId ?? "portal-connected");
          if (data.studentName) setStudentName(data.studentName);
          else setStudentName(params.username);
          if (data.studentInfo) setStudentInfo(data.studentInfo);
          return { success: true };
        }

        const errMsg = data.message || data.error || "Login failed";
        const loginError = mapErrorToLoginError(errMsg, data.errorCode);
        setLastError(loginError);
        setError(errMsg);
        return { success: false, error: loginError };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Login failed";
        const loginError = mapErrorToLoginError(msg);
        setLastError(loginError);
        setError(msg);
        return { success: false, error: loginError };
      } finally {
        setLoading(false);
      }
    },
    [clearError, setSessionId, setStudentName, setStudentInfo]
  );

  const logout = React.useCallback(async () => {
    setLoading(true);
    try {
      try {
        await fetchJSON(
          `/api/auth/logout`,
          { method: "POST" },
          sessionId
        );
      } catch {}
      setSessionId(null);
      setStudentName(null);
      setStudentInfo(null);
      try {
        localStorage.removeItem("srm_app_user");
      } catch {}
      clearError();
    } finally {
      setLoading(false);
    }
  }, [sessionId, setSessionId, setStudentName, setStudentInfo, clearError]);

  const getDashboard = React.useCallback(() => {
    return withLoading(() =>
      fetchJSON<DashboardData>(
        `${API_BASE}/dashboard`,
        { method: "GET" },
        sessionId
      )
    );
  }, [withLoading, sessionId]);

  const getProfile = React.useCallback(() => {
    return withLoading(() =>
      fetchJSON<ProfileData>(
        `${API_BASE}/profile`,
        { method: "GET" },
        sessionId
      )
    );
  }, [withLoading, sessionId]);

  const getGrades = React.useCallback(() => {
    return withLoading(() =>
      fetchJSON<GradesData>(
        `${API_BASE}/grades`,
        { method: "GET" },
        sessionId
      )
    );
  }, [withLoading, sessionId]);

  const getHostel = React.useCallback(() => {
    return withLoading(() =>
      fetchJSON<HostelData>(
        `${API_BASE}/hostel`,
        { method: "GET" },
        sessionId
      )
    );
  }, [withLoading, sessionId]);

  const getExams = React.useCallback(() => {
    return withLoading(() =>
      fetchJSON<ExamTimetableData>(
        `${API_BASE}/exams`,
        { method: "GET" },
        sessionId
      )
    );
  }, [withLoading, sessionId]);

  const refreshAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        fetchJSON<DashboardData>(`${API_BASE}/dashboard`, { method: "GET" }, sessionId),
        fetchJSON<ProfileData>(`${API_BASE}/profile`, { method: "GET" }, sessionId),
        fetchJSON<GradesData>(`${API_BASE}/grades`, { method: "GET" }, sessionId),
        fetchJSON<HostelData>(`${API_BASE}/hostel`, { method: "GET" }, sessionId),
        fetchJSON<ExamTimetableData>(`${API_BASE}/exams`, { method: "GET" }, sessionId),
      ]);
      return {
        dashboard: results[0].status === "fulfilled" ? results[0].value : null,
        profile: results[1].status === "fulfilled" ? results[1].value : null,
        grades: results[2].status === "fulfilled" ? results[2].value : null,
        hostel: results[3].status === "fulfilled" ? results[3].value : null,
        exams: results[4].status === "fulfilled" ? results[4].value : null,
      };
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const exportGrades = React.useCallback(async () => {
    setLoading(true);
    clearError();
    try {
      const headers: Record<string, string> = {};
      if (sessionId) headers["Authorization"] = `Bearer ${sessionId}`;

      const response = await fetch(`${API_BASE}/grades/export`, {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (response.status === 401) {
        handle401();
        throw new Error("Session expired");
      }

      if (!response.ok) {
        throw new Error(`Export failed: HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "grades.csv";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId, clearError, handle401]);

  return {
    sessionId: hydrated ? sessionId : null,
    studentName: hydrated ? studentName : null,
    loading,
    error,
    lastError,
    login,
    logout,
    getDashboard,
    getProfile,
    getGrades,
    getHostel,
    getExams,
    refreshAll,
    getCaptcha,
    refreshCaptcha,
    clearError,
    exportGrades,
  };
}
