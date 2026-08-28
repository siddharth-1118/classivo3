import crypto from 'crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
type User = { id: string; email: string; name?: string | null; createdAt: Date; updatedAt: Date };
import type { ApiErrorCode } from '@/lib/types/portal';
import { SESSION_COOKIE_NAME, getSessionFromToken } from './session';

export interface RequireAppUserResult {
  user?: User;
  unauthorized?: Response;
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
  return crypto.randomBytes(16).toString('hex');
}

export function successResponse<T>(data?: T, status = 200): Response {
  return NextResponse.json({ ok: true, data }, { status });
}

export function errorResponse(
  error: ApiErrorCode,
  message: string,
  status = 400,
  details?: unknown,
): Response {
  return NextResponse.json({ ok: false, error, message, details }, { status });
}
