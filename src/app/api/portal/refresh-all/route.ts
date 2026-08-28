export const dynamic = 'force-dynamic';

import type { NextRequest } from "next/server";
import axios from "axios";

type SnapshotType = 'DASHBOARD' | 'PROFILE' | 'GRADES' | 'HOSTEL' | 'EXAMS';
import {
  requireAppUser,
  withErrorHandling,
  successResponse,
  errorResponse,
} from "@/lib/server/auth/route-helpers";
import type { ApiErrorCode } from "@/lib/types/portal";
import type {
  DashboardData,
  ProfileData,
  GradesData,
  HostelData,
  ExamTimetableData,
} from "@/lib/types/portal";
import { SRMISTPortalProvider } from "@/lib/server/portal/srmist-provider";
import { portalSessionStore } from "@/lib/server/portal/session-store";
import {
  persistSnapshot,
  upsertPortalConnection,
  startSyncJob,
  finishSyncJob,
  computeRecordCount,
} from "@/lib/server/db/snapshot-store";
import {
  type SnapshotDataType,
  SNAPSHOT_TO_PRISMA,
} from "../_shared";

interface SyncResults {
  dashboard?: DashboardData;
  profile?: ProfileData;
  grades?: GradesData;
  hostel?: HostelData;
  exams?: ExamTimetableData;
  failed: string[];
}

interface SyncJobResult {
  snapshotType: SnapshotType;
  success: boolean;
  recordCount?: number;
  errorMessage?: string;
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
): Promise<void> {
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
}

type SyncTypeEntry = {
  key: SnapshotDataType;
  fetch: (
    provider: SRMISTPortalProvider,
    session: Parameters<
      SRMISTPortalProvider["getAuthenticatedDashboard"]
    >[0]
  ) => Promise<unknown>;
};

const SYNC_TYPES: SyncTypeEntry[] = [
  {
    key: "dashboard",
    fetch: (p, s) => p.getAuthenticatedDashboard(s),
  },
  {
    key: "profile",
    fetch: (p, s) => p.getAuthenticatedProfile(s),
  },
  {
    key: "grades",
    fetch: (p, s) => p.getAuthenticatedGrades(s),
  },
  {
    key: "hostel",
    fetch: (p, s) => p.getAuthenticatedHostel(s),
  },
  {
    key: "exams",
    fetch: (p, s) => p.getAuthenticatedExamTimetable(s),
  },
];

export const POST = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  const auth = await requireAppUser(req);
  if (auth.unauthorized) {
    return auth.unauthorized;
  }
  const user = auth.user!;

  const inMemorySession = portalSessionStore.getAuthenticatedSession(user.id);
  if (!inMemorySession) {
    await handleSessionExpired(user.id);
    return errorResponse(
      "SESSION_EXPIRED" as ApiErrorCode,
      "Your portal session has expired. Please reconnect to continue.",
      401
    );
  }

  const job = await startSyncJob(user.id);
  const jobResults: SyncJobResult[] = [];
  const output: SyncResults = { failed: [] };
  let anySessionExpired = false;

  const settled = await Promise.allSettled(
    SYNC_TYPES.map(async (entry) => {
      const provider = new SRMISTPortalProvider();
      const data = await entry.fetch(provider, inMemorySession.loginSession);
      await persistSnapshot(user.id, entry.key, data as never);
      return { key: entry.key, data };
    })
  );

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    const entry = SYNC_TYPES[i];
    const prismaType = SNAPSHOT_TO_PRISMA[entry.key];

    if (result.status === "fulfilled") {
      const { key, data } = result.value as {
        key: SnapshotDataType;
        data: unknown;
      };
      (output as unknown as Record<string, unknown>)[key] = data;
      jobResults.push({
        snapshotType: prismaType,
        success: true,
        recordCount: computeRecordCount(data as never, key),
      });
    } else {
      const err = result.reason;
      const errMsg =
        err instanceof Error ? err.message : String(err ?? "Unknown error");
      output.failed.push(entry.key);
      jobResults.push({
        snapshotType: prismaType,
        success: false,
        errorMessage: errMsg,
      });
      if (isSessionExpiredError(err)) {
        anySessionExpired = true;
      }
    }
  }

  const allFailed = output.failed.length === SYNC_TYPES.length;

  if (anySessionExpired) {
    await handleSessionExpired(user.id, inMemorySession.netId);
  } else if (!allFailed) {
    await upsertPortalConnection({
      userId: user.id,
      netId: inMemorySession.netId,
      status: "CONNECTED",
      lastSyncedAt: new Date(),
    });
  }

  const overallStatus: "SUCCESS" | "FAILED" =
    output.failed.length === 0 ? "SUCCESS" : "FAILED";

  if (job) {
    const firstErr =
      jobResults.find((r) => !r.success)?.errorMessage ?? undefined;
    await finishSyncJob(job.id, overallStatus, firstErr, jobResults);
  }

  if (anySessionExpired && allFailed) {
    return errorResponse(
      "SESSION_EXPIRED" as ApiErrorCode,
      "Your portal session has expired. Please reconnect to continue.",
      401
    );
  }

  return successResponse(output);
});
