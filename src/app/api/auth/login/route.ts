export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  withErrorHandling,
  errorResponse,
} from '@/lib/server/auth/route-helpers';
import type { ApiErrorCode } from '@/lib/types/portal';
import { prisma } from '@/lib/server/db/prisma';
import { createAppSession, setSessionCookie } from '@/lib/server/auth/session';
import { SRMISTPortalProvider } from '@/lib/server/portal/srmist-provider';
import { portalSessionStore } from '@/lib/server/portal/session-store';
import { upsertPortalConnection, persistSnapshot } from '@/lib/server/db/snapshot-store';

const LoginSchema = z.object({
  username: z.string().min(2).max(50),
  password: z.string().min(1).max(100),
  captcha: z.string().min(1).max(20),
  requestId: z.string().min(1),
});

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS ?? 60000);
const RATE_LIMIT_MAX = Number(process.env.LOGIN_RATE_LIMIT_MAX ?? 10);

function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const existing = rateLimitMap.get(ip);

  if (existing && now < existing.resetTime) {
    existing.count += 1;
    if (existing.count > RATE_LIMIT_MAX) {
      return {
        allowed: false,
        retryAfterMs: existing.resetTime - now,
      };
    }
    rateLimitMap.set(ip, existing);
    return { allowed: true, retryAfterMs: 0 };
  }

  rateLimitMap.set(ip, {
    count: 1,
    resetTime: now + RATE_LIMIT_WINDOW_MS,
  });
  return { allowed: true, retryAfterMs: 0 };
}

function getClientIp(req: NextRequest): string {
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0]?.trim() ?? 'unknown';
  }

  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  return 'unknown';
}

function getUserAgent(req: NextRequest): string {
  return req.headers.get('user-agent') ?? '';
}

export const POST = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(clientIp);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'RATE_LIMITED' as ApiErrorCode,
        message: `Too many login attempts. Try again in ${Math.ceil(rateLimit.retryAfterMs / 1000)} seconds.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(rateLimit.retryAfterMs / 1000).toString(),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('PARSE_FAILED' as ApiErrorCode, 'Invalid JSON body', 400);
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Invalid request body',
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const { username, password, captcha, requestId } = parsed.data;
  const trimmedUsername = username.trim();
  const email = `${trimmedUsername.toLowerCase()}@srmist.edu.in`;

  // Authenticate against official SRMIST portal
  const provider = new SRMISTPortalProvider();
  const loginResult = await provider.login({
    netid: trimmedUsername,
    password,
    captcha: captcha.trim(),
    requestId,
  });

  if (!loginResult.success) {
    const errorCode: ApiErrorCode = loginResult.errorCode ?? 'PORTAL_UNAVAILABLE';
    const message = loginResult.errorMessage ?? 'Connection to the portal failed. Please try again.';
    const statusMap: Record<ApiErrorCode, number> = {
      INVALID_CAPTCHA: 400,
      INVALID_CREDENTIALS: 401,
      SESSION_EXPIRED: 400,
      PORTAL_UNAVAILABLE: 503,
      CONSENT_REQUIRED: 400,
      VALIDATION_ERROR: 400,
      UNAUTHORIZED: 401,
      RATE_LIMITED: 429,
      INTERNAL_ERROR: 500,
      PARSE_FAILED: 500,
    };
    return errorResponse(errorCode, message, statusMap[errorCode] ?? 400);
  }

  // Check if user exists in local database, otherwise register
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: trimmedUsername,
        passwordHash: 'portal-auth-auto-created',
      },
    });
  }

  // Create App Auth Session
  const userAgent = getUserAgent(req);
  const token = await createAppSession(user.id, { ip: clientIp, userAgent });

  // Store connection cookie jar details in DB
  const authenticatedSession = portalSessionStore.getAuthenticatedSession(trimmedUsername);
  const cookieJar = authenticatedSession?.loginSession._cookieJarSer;

  await upsertPortalConnection({
    userId: user.id,
    netId: trimmedUsername,
    status: 'CONNECTED',
    portalSessionCookieJar: cookieJar,
    lastSyncedAt: new Date(),
  });

  // Pre-fetch all key portal snapshots immediately
  const portalSession = authenticatedSession?.loginSession;
  if (portalSession) {
    try {
      const profile = await provider.getAuthenticatedProfile(portalSession);
      await persistSnapshot(user.id, 'profile', profile);
      if (profile.studentName) {
        await prisma.user.update({
          where: { id: user.id },
          data: { name: profile.studentName },
        });
        user.name = profile.studentName;
      }
    } catch (err) {
      console.error('Failed to pre-fetch profile:', err);
    }

    try {
      const dashboard = await provider.getAuthenticatedDashboard(portalSession);
      await persistSnapshot(user.id, 'dashboard', dashboard);
    } catch (err) {
      console.error('Failed to pre-fetch dashboard:', err);
    }

    try {
      const grades = await provider.getAuthenticatedGrades(portalSession);
      await persistSnapshot(user.id, 'grades', grades);
    } catch (err) {
      console.error('Failed to pre-fetch grades:', err);
    }

    try {
      const hostel = await provider.getAuthenticatedHostel(portalSession);
      await persistSnapshot(user.id, 'hostel', hostel);
    } catch (err) {
      console.error('Failed to pre-fetch hostel:', err);
    }

    try {
      const exams = await provider.getAuthenticatedExamTimetable(portalSession);
      await persistSnapshot(user.id, 'exams', exams);
    } catch (err) {
      console.error('Failed to pre-fetch exams:', err);
    }
  }

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });

  await setSessionCookie(response, token);
  return response;
});
