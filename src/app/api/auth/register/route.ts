export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  withErrorHandling,
  errorResponse,
  successResponse,
} from '@/lib/server/auth/route-helpers';
import type { ApiErrorCode } from '@/lib/types/portal';
import { prisma } from '@/lib/server/db/prisma';
import { hashPassword } from '@/lib/server/auth/password';

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be at most 128 characters'),
  name: z.string().max(255).optional(),
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

export const POST = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(clientIp);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'RATE_LIMITED' as ApiErrorCode,
        message: `Too many requests. Try again in ${Math.ceil(rateLimit.retryAfterMs / 1000)} seconds.`,
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

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Invalid request body',
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const { email, password, name } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existingUser) {
    return errorResponse(
      'VALIDATION_ERROR',
      'A user with this email already exists',
      409,
      { email: ['Email is already registered'] },
    );
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: name?.trim() || null,
    },
  });

  return successResponse(undefined, 201);
});
