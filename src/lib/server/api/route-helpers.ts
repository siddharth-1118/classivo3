import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { z, ZodSchema } from 'zod';
import { portalSessionStore } from '@/lib/server/portal/session-store';
import type { ApiErrorCode, PortalAuthenticatedSession } from '@/lib/types/portal';
type User = { id: string; email: string; name?: string | null; createdAt: Date; updatedAt: Date };
import { SESSION_COOKIE_NAME, getSessionFromToken } from '@/lib/server/auth/session';

export type { ApiErrorCode, PortalAuthenticatedSession };

export interface RequireAuthResult {
  session?: PortalAuthenticatedSession;
  response401?: Response;
  sessionId?: string;
}

export interface RequireAppUserResult {
  user?: User;
  unauthorized?: Response;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitBuckets = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  ip: string,
  windowMs: number,
  max: number,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucketKey = `${ip}:${windowMs}`;
  const existing = rateLimitBuckets.get(bucketKey);

  if (existing && now < existing.resetTime) {
    existing.count += 1;
    if (existing.count > max) {
      return {
        allowed: false,
        retryAfterMs: existing.resetTime - now,
      };
    }
    rateLimitBuckets.set(bucketKey, existing);
    return { allowed: true, retryAfterMs: 0 };
  }

  rateLimitBuckets.set(bucketKey, {
    count: 1,
    resetTime: now + windowMs,
  });
  return { allowed: true, retryAfterMs: 0 };
}

export function requireAuth(req: NextRequest): RequireAuthResult {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      response401: NextResponse.json(
        {
          ok: false,
          error: 'UNAUTHORIZED' as ApiErrorCode,
          message: 'Missing or invalid Authorization header',
        },
        { status: 401 },
      ),
    };
  }

  const sessionId = authHeader.slice(7).trim();
  if (!sessionId) {
    return {
      response401: NextResponse.json(
        {
          ok: false,
          error: 'UNAUTHORIZED' as ApiErrorCode,
          message: 'Missing session ID',
        },
        { status: 401 },
      ),
    };
  }

  const session = portalSessionStore.getAuthenticatedSession(sessionId);
  if (!session) {
    return {
      response401: NextResponse.json(
        {
          ok: false,
          error: 'SESSION_EXPIRED' as ApiErrorCode,
          message: 'Session expired or not found',
        },
        { status: 401 },
      ),
    };
  }

  portalSessionStore.refreshAuthenticatedSession(sessionId);

  return { session, sessionId };
}

export async function requireAppUser(req: NextRequest): Promise<RequireAppUserResult> {
  const cookieHeader = req.headers.get('cookie');
  let token: string | undefined;

  if (cookieHeader) {
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const [name, value] = pair.trim().split('=');
      if (name === SESSION_COOKIE_NAME) {
        token = value;
        break;
      }
    }
  }

  if (!token) {
    return {
      unauthorized: NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED' as ApiErrorCode, message: 'No session provided' },
        { status: 401 },
      ),
    };
  }

  const session = await getSessionFromToken(token);
  if (!session || !session.user) {
    return {
      unauthorized: NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED' as ApiErrorCode, message: 'Session invalid or expired' },
        { status: 401 },
      ),
    };
  }

  return { user: session.user };
}

type HandlerFn = (req: NextRequest, context?: unknown) => Promise<Response> | Response;

export function withErrorHandling(handler: HandlerFn): HandlerFn {
  return async (req: NextRequest, context?: unknown): Promise<Response> => {
    try {
      return await handler(req, context);
    } catch (err) {
      const error = err as Error & { code?: string };

      if (error.message === 'UNAUTHORIZED') {
        return NextResponse.json(
          {
            ok: false,
            error: 'SESSION_EXPIRED' as ApiErrorCode,
            message: 'Portal session expired',
          },
          { status: 401 },
        );
      }

      console.error('API Handler Error:', error);

      return NextResponse.json(
        {
          ok: false,
          error: 'INTERNAL_ERROR' as ApiErrorCode,
          message: 'An unexpected error occurred',
          details:
            process.env.NODE_ENV === 'development'
              ? { message: error.message, stack: error.stack }
              : undefined,
        },
        { status: 500 },
      );
    }
  };
}

export function generateRequestId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function errorResponse(
  error: ApiErrorCode,
  message: string,
  status = 400,
  details?: unknown,
): Response {
  return NextResponse.json(
    {
      ok: false,
      error,
      message,
      details,
    },
    { status },
  );
}

export function successResponse<T>(data?: T, status = 200): Response {
  return NextResponse.json(
    {
      ok: true,
      data,
    },
    { status },
  );
}

export interface ZodParseResult<T> {
  ok: true;
  data: T;
}

export interface ZodParseError {
  ok: false;
  response: Response;
}

export function withZodParse<T>(
  schema: ZodSchema<T>,
  body: unknown,
): ZodParseResult<T> | ZodParseError {
  const result = schema.safeParse(body);
  if (result.success) {
    return { ok: true, data: result.data as T };
  }
  return {
    ok: false,
    response: errorResponse(
      'VALIDATION_ERROR',
      'Invalid request body',
      400,
      result.error.flatten().fieldErrors,
    ),
  };
}
