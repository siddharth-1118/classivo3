export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import type { ApiErrorCode } from '@/lib/types/portal';
import {
  withErrorHandling,
  requireAppUser,
  successResponse,
  errorResponse,
} from '@/lib/server/auth/route-helpers';
import { SRMISTPortalProvider } from '@/lib/server/portal/srmist-provider';
import { portalSessionStore } from '@/lib/server/portal/session-store';
import {
  appendConsentLog,
  upsertPortalConnection,
  getClientIp,
  getUserAgent,
} from '@/lib/server/db/snapshot-store';

const LoginSchema = z.object({
  netid: z.string().min(2).max(50),
  password: z.string().min(1).max(100),
  captcha: z.string().min(1).max(20),
  requestId: z.string().min(1),
  consent: z.boolean().refine((v) => v === true, {
    message: 'Consent must be granted',
  }),
});

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX = 5;

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

export const POST = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  const { user, unauthorized } = await requireAppUser(req);
  if (unauthorized) return unauthorized;
  if (!user) return unauthorized!;

  const clientIp = getClientIp(req);
  const userAgent = getUserAgent(req);

  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'RATE_LIMITED' as ApiErrorCode,
        message: `Too many connection attempts. Try again in ${Math.ceil(rateLimit.retryAfterMs / 1000)} seconds.`,
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
    return errorResponse('VALIDATION_ERROR', 'Invalid JSON body', 400);
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

  const { netid, password, captcha, requestId, consent } = parsed.data;
  const trimmedNetId = netid.trim();

  if (!consent) {
    return errorResponse(
      'CONSENT_REQUIRED',
      'You must grant consent to connect to the portal',
      400,
    );
  }

  await appendConsentLog({
    userId: user.id,
    action: 'CONNECT_ATTEMPT',
    ip: clientIp,
    userAgent,
    netId: trimmedNetId,
  });

  const provider = new SRMISTPortalProvider();
  const loginResult = await provider.login({
    netid: trimmedNetId,
    password,
    captcha: captcha.trim(),
    requestId,
  });

  if (!loginResult.success) {
    await appendConsentLog({
      userId: user.id,
      action: 'CONNECT_ATTEMPT',
      ip: clientIp,
      userAgent,
      netId: trimmedNetId,
      success: false,
      errorCode: loginResult.errorCode ?? null,
    });

    const errorCode: ApiErrorCode = loginResult.errorCode ?? 'PORTAL_UNAVAILABLE';
    const message =
      loginResult.errorMessage ??
      'Connection to the portal failed. Please try again.';

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

  await appendConsentLog({
    userId: user.id,
    action: 'CONNECT_ATTEMPT',
    ip: clientIp,
    userAgent,
    netId: trimmedNetId,
    success: true,
  });

  const authenticatedSession = portalSessionStore.getAuthenticatedSession(trimmedNetId);
  const cookieJar = authenticatedSession?.loginSession._cookieJarSer;

  await upsertPortalConnection({
    userId: user.id,
    netId: trimmedNetId,
    status: 'CONNECTED',
    portalSessionCookieJar: cookieJar,
  });

  return successResponse({ connected: true, netId: trimmedNetId });
});
