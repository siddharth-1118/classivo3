import type {
  PortalLoginSession,
  PortalAuthenticatedSession,
} from "@/lib/types/portal";
import { getTempSessionTTLMs, getSessionTTLMs } from "@/config/env";

const TEMP_PORTAL_SESSION_TTL_MS: number = getTempSessionTTLMs();
const CLEANUP_INTERVAL_MS: number = 60 * 1000;

type TempSessionEntry = {
  session: PortalLoginSession;
  createdAt: number;
  lastCaptchaAnswer?: string;
};

function generateRequestId(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

class PortalSessionStore {
  private tempSessions = new Map<string, TempSessionEntry>();
  private authenticatedSessions = new Map<string, PortalAuthenticatedSession>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window === "undefined") {
      this.cleanupInterval = setInterval(() => {
        this.cleanupExpired();
      }, CLEANUP_INTERVAL_MS);
      if (
        this.cleanupInterval &&
        typeof (this.cleanupInterval as { unref?: () => void }).unref ===
          "function"
      ) {
        (this.cleanupInterval as { unref: () => void }).unref();
      }
    }
  }

  private isTempExpired(entry: TempSessionEntry): boolean {
    return Date.now() - entry.createdAt > TEMP_PORTAL_SESSION_TTL_MS;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const sessionTTL = getSessionTTLMs();

    for (const [key, entry] of this.tempSessions.entries()) {
      if (now - entry.createdAt > TEMP_PORTAL_SESSION_TTL_MS) {
        this.tempSessions.delete(key);
      }
    }

    for (const [key, entry] of this.authenticatedSessions.entries()) {
      if (now > entry.expiresAt) {
        this.authenticatedSessions.delete(key);
      }
    }
  }

  createTempPortalSession(
    session: PortalLoginSession,
    captchaAnswer?: string,
  ): string {
    const requestId = generateRequestId();
    this.tempSessions.set(requestId, {
      session,
      createdAt: Date.now(),
      lastCaptchaAnswer: captchaAnswer,
    });
    return requestId;
  }

  getTempPortalSession(
    requestId: string,
  ): { session: PortalLoginSession; lastCaptchaAnswer?: string } | null {
    const entry = this.tempSessions.get(requestId);
    if (!entry) return null;

    if (this.isTempExpired(entry)) {
      this.tempSessions.delete(requestId);
      return null;
    }

    return {
      session: entry.session,
      lastCaptchaAnswer: entry.lastCaptchaAnswer,
    };
  }

  consumeTempPortalSession(
    requestId: string,
  ): { session: PortalLoginSession; lastCaptchaAnswer?: string } | null {
    const entry = this.tempSessions.get(requestId);
    if (!entry) return null;

    this.tempSessions.delete(requestId);

    if (this.isTempExpired(entry)) {
      return null;
    }

    return {
      session: entry.session,
      lastCaptchaAnswer: entry.lastCaptchaAnswer,
    };
  }

  storeTempCaptchaAnswer(requestId: string, captchaAnswer: string): void {
    const entry = this.tempSessions.get(requestId);
    if (!entry || this.isTempExpired(entry)) return;
    entry.lastCaptchaAnswer = captchaAnswer;
    entry.createdAt = Date.now();
  }

  storeAuthenticatedSession(
    appUserId: string,
    data: Omit<
      PortalAuthenticatedSession,
      "authenticatedAt" | "expiresAt"
    > & { consentGrantedAt?: number },
  ): void {
    const now = Date.now();
    const ttl = getSessionTTLMs();

    if (data.loginSession && data.loginSession._cookieJarSer !== undefined) {
      data.loginSession = {
        ...data.loginSession,
        _cookieJarSer: data.loginSession._cookieJarSer,
      };
    }

    this.authenticatedSessions.set(appUserId, {
      ...data,
      authenticatedAt: now,
      expiresAt: now + ttl,
    });
  }

  getAuthenticatedSession(
    appUserId: string,
  ): PortalAuthenticatedSession | null {
    const entry = this.authenticatedSessions.get(appUserId);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.authenticatedSessions.delete(appUserId);
      return null;
    }

    return entry;
  }

  refreshAuthenticatedSession(appUserId: string): void {
    const entry = this.authenticatedSessions.get(appUserId);
    if (!entry) return;
    entry.expiresAt = Date.now() + getSessionTTLMs();
  }

  clearAuthenticatedSession(appUserId: string): void {
    this.authenticatedSessions.delete(appUserId);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const portalSessionStore = new PortalSessionStore();
