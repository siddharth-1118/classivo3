import { Prisma, type SnapshotType, type ConsentAction, type PortalConnectionStatus } from "@prisma/client";
import { prisma } from "@/lib/server/db/prisma";
import type {
  DashboardData,
  ProfileData,
  GradesData,
  HostelData,
  ExamTimetableData,
} from "@/lib/types/portal";
import type { User } from "@prisma/client";

const SNAPSHOT_TYPES: Record<string, SnapshotType> = {
  dashboard: "DASHBOARD",
  profile: "PROFILE",
  grades: "GRADES",
  hostel: "HOSTEL",
  exams: "EXAMS",
} as const;

type SnapshotDataShape =
  | DashboardData
  | ProfileData
  | GradesData
  | HostelData
  | ExamTimetableData;

export function safeSourceTs(data: SnapshotDataShape): Date {
  const ts = (data as { sourceTimestamp?: string }).sourceTimestamp;
  if (ts) {
    try {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) return d;
    } catch {
      // fall through
    }
  }
  return new Date();
}

export async function persistSnapshot(
  userId: string,
  type: "dashboard" | "profile" | "grades" | "hostel" | "exams",
  data: SnapshotDataShape
): Promise<void> {
  const snapshotType = SNAPSHOT_TYPES[type];
  if (!snapshotType) return;

  const sourceTimestamp = safeSourceTs(data);

  try {
    await prisma.studentSnapshot.upsert({
      where: {
        userId_type: {
          userId,
          type: snapshotType,
        },
      },
      create: {
        userId,
        type: snapshotType,
        data: data as unknown as Prisma.InputJsonValue,
        sourceTimestamp,
      },
      update: {
        data: data as unknown as Prisma.InputJsonValue,
        sourceTimestamp,
        createdAt: new Date(),
      },
    });
  } catch (err) {
    console.error(`[snapshot] Failed to persist ${type} snapshot for user ${userId}:`, err);
  }
}

export async function getLatestSnapshot<T = unknown>(
  userId: string,
  type: "dashboard" | "profile" | "grades" | "hostel" | "exams"
): Promise<T | null> {
  const snapshotType = SNAPSHOT_TYPES[type];
  if (!snapshotType) return null;

  try {
    const snap = await prisma.studentSnapshot.findUnique({
      where: {
        userId_type: {
          userId,
          type: snapshotType,
        },
      },
      select: { data: true },
    });
    if (!snap) return null;
    return (snap.data ?? null) as unknown as T | null;
  } catch (err) {
    console.error(`[snapshot] Failed to read ${type} snapshot for user ${userId}:`, err);
    return null;
  }
}

export interface UpsertConnectionOpts {
  userId: string;
  netId: string;
  status: PortalConnectionStatus;
  lastSyncedAt?: Date;
  errorMessage?: string | null;
  portalSessionCookieJar?: unknown;
  disconnectedAt?: Date | null;
}

export async function upsertPortalConnection(
  opts: UpsertConnectionOpts
): Promise<void> {
  try {
    const now = opts.lastSyncedAt ?? new Date();
    await prisma.portalConnection.upsert({
      where: { userId: opts.userId },
      create: {
        userId: opts.userId,
        status: opts.status,
        netId: opts.netId,
        lastSyncedAt: now,
        connectedAt: now,
        disconnectedAt: opts.disconnectedAt ?? null,
        errorMessage: opts.errorMessage ?? null,
        portalSessionCookieJar:
          opts.portalSessionCookieJar == null
            ? Prisma.JsonNull
            : (opts.portalSessionCookieJar as Prisma.InputJsonValue),
      },
      update: {
        status: opts.status,
        netId: opts.netId,
        lastSyncedAt: now,
        disconnectedAt: opts.disconnectedAt ?? null,
        errorMessage: opts.errorMessage ?? null,
        portalSessionCookieJar:
          opts.portalSessionCookieJar == null
            ? Prisma.JsonNull
            : (opts.portalSessionCookieJar as Prisma.InputJsonValue),
      },
    });
  } catch (err) {
    console.error(`[snapshot] Failed to upsert portal connection for user ${opts.userId}:`, err);
  }
}

export async function disconnectPortalConnection(userId: string): Promise<void> {
  try {
    await prisma.portalConnection.update({
      where: { userId },
      data: {
        status: "DISCONNECTED",
        disconnectedAt: new Date(),
        portalSessionCookieJar: Prisma.JsonNull,
        errorMessage: null,
      },
    });
  } catch (err) {
    console.error(`[snapshot] Failed to disconnect portal connection for user ${userId}:`, err);
  }
}

export async function appendConsentLog(
  input: {
    userId: string;
    action: ConsentAction;
    ip: string;
    userAgent: string;
    netId?: string | null;
    success?: boolean | null;
    errorCode?: string | null;
  }
): Promise<void> {
  try {
    await prisma.consentLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        ip: input.ip,
        userAgent: input.userAgent,
        netId: input.netId ?? null,
        success: input.success ?? null,
        errorCode: input.errorCode ?? null,
      },
    });
  } catch (err) {
    console.error(`[snapshot] Failed to append consent log for user ${input.userId}:`, err);
  }
}

export async function startSyncJob(
  userId: string | null,
  opts?: Pick<Prisma.SyncJobUncheckedCreateInput, "status" | "startedAt" | "finishedAt" | "errorMessage">
) {
  try {
    return await prisma.syncJob.create({
      data: {
        status: "RUNNING",
        startedAt: new Date(),
        ...(userId ? { userId } : {}),
        ...(opts ?? {}),
      },
      select: { id: true },
    });
  } catch (err) {
    console.error("[snapshot] Failed to create sync job:", err);
    return null;
  }
}

export async function finishSyncJob(
  jobId: string,
  status: "SUCCESS" | "FAILED",
  errorMessage?: string,
  results?: Array<{
    snapshotType: SnapshotType;
    success: boolean;
    recordCount?: number;
    errorMessage?: string;
  }>
): Promise<void> {
  try {
    await prisma.syncJob.update({
      where: { id: jobId },
      data: {
        status,
        finishedAt: new Date(),
        errorMessage: errorMessage ?? null,
        results: results
          ? {
              create: results.map((r) => ({
                snapshotType: r.snapshotType,
                success: r.success,
                recordCount: r.recordCount ?? undefined,
                errorMessage: r.errorMessage ?? null,
              })),
            }
          : undefined,
      },
    });
  } catch (err) {
    console.error("[snapshot] Failed to finalize sync job:", err);
  }
}

export function getClientIp(req: { headers: Headers }): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? "unknown";
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

export function getUserAgent(req: { headers: Headers }): string {
  return req.headers.get("user-agent") ?? "";
}

export function computeRecordCount(data: SnapshotDataShape, type: string): number {
  if (type === "grades") {
    const g = data as GradesData;
    return g.grades?.length ?? 0;
  }
  if (type === "exams") {
    const e = data as ExamTimetableData;
    return e.timetable?.length ?? 0;
  }
  if (type === "hostel") {
    const h = data as HostelData;
    return (h.payments?.length ?? 0) + (h.allotments?.length ?? 0);
  }
  return 1;
}
