import type { NextRequest } from "next/server";
import axios from "axios";
import type { User } from "@prisma/client";
import type { SnapshotType } from "@prisma/client";
import {
  requireAppUser,
  successResponse,
  errorResponse,
} from "@/lib/server/auth/route-helpers";
import type { ApiErrorCode } from "@/lib/types/portal";
import { SRMISTPortalProvider } from "@/lib/server/portal/srmist-provider";
import { portalSessionStore } from "@/lib/server/portal/session-store";
import {
  persistSnapshot,
  getLatestSnapshot,
  upsertPortalConnection,
} from "@/lib/server/db/snapshot-store";
import type {
  DashboardData,
  ProfileData,
  GradesData,
  HostelData,
  ExamTimetableData,
  PortalLoginSession,
} from "@/lib/types/portal";

export type SnapshotDataType =
  | "dashboard"
  | "profile"
  | "grades"
  | "hostel"
  | "exams";

export const SNAPSHOT_TO_PRISMA: Record<SnapshotDataType, SnapshotType> = {
  dashboard: "DASHBOARD",
  profile: "PROFILE",
  grades: "GRADES",
  hostel: "HOSTEL",
  exams: "EXAMS",
};

type ProviderMethod = (
  session: PortalLoginSession
) => Promise<
  DashboardData | ProfileData | GradesData | HostelData | ExamTimetableData
>;

export interface FetchPortalDataResult<T> {
  response?: Response;
  data?: T;
  user?: User;
  sessionExpired?: boolean;
}

function isSessionExpiredError(err: unknown): boolean {
  if (!err) return false;

  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 401) return true;
    const finalUrl =
      err.request?.res?.responseUrl ||
      (err.request as { res?: { responseUrl?: string } })?.res?.responseUrl;
    if (finalUrl && /login([^a-z]|$)/i.test(finalUrl)) return true;
  }

  const e = err as Error & { code?: string };
  if (typeof e.code === "string") {
    if (e.code === "UNAUTHORIZED" || e.code === "SESSION_EXPIRED") return true;
  }
  if (typeof e.message === "string") {
    if (e.message === "UNAUTHORIZED" || e.message === "SESSION_EXPIRED")
      return true;
  }

  return false;
}

async function handleSessionExpired(
  userId: string,
  netId?: string
): Promise<Response> {
  portalSessionStore.clearAuthenticatedSession(userId);
  try {
    await upsertPortalConnection({
      userId,
      netId: netId ?? "",
      status: "EXPIRED",
    });
  } catch {
    // ignore
  }
  return errorResponse(
    "SESSION_EXPIRED" as ApiErrorCode,
    "Your portal session has expired. Please reconnect to continue.",
    401
  );
}

export async function fetchPortalData<T>(
  req: NextRequest,
  snapshotType: SnapshotDataType,
  getProviderMethod: (provider: SRMISTPortalProvider) => ProviderMethod
): Promise<FetchPortalDataResult<T>> {
  const auth = await requireAppUser(req);
  if (auth.unauthorized) {
    return { response: auth.unauthorized };
  }
  const user = auth.user!;

  const inMemorySession = portalSessionStore.getAuthenticatedSession(user.id);

  if (!inMemorySession) {
    const cached = await getLatestSnapshot<T>(user.id, snapshotType);
    if (cached !== null) {
      return { data: cached, user };
    }
    const expiredResp = await handleSessionExpired(user.id);
    return { response: expiredResp, sessionExpired: true };
  }

  try {
    const provider = new SRMISTPortalProvider();
    const method = getProviderMethod(provider);
    const result = (await method(inMemorySession.loginSession)) as T;

    await persistSnapshot(user.id, snapshotType, result as never);
    await upsertPortalConnection({
      userId: user.id,
      netId: inMemorySession.netId,
      status: "CONNECTED",
      lastSyncedAt: new Date(),
    });

    return { data: result, user };
  } catch (err) {
    if (isSessionExpiredError(err)) {
      const expiredResp = await handleSessionExpired(
        user.id,
        inMemorySession.netId
      );
      return { response: expiredResp, sessionExpired: true };
    }
    throw err;
  }
}

export async function fetchPortalDataResponse<T>(
  req: NextRequest,
  snapshotType: SnapshotDataType,
  getProviderMethod: (provider: SRMISTPortalProvider) => ProviderMethod
): Promise<Response> {
  const result = await fetchPortalData<T>(req, snapshotType, getProviderMethod);
  if (result.response) return result.response;
  return successResponse(result.data);
}
