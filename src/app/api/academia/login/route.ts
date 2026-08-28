export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  withErrorHandling,
  errorResponse,
} from '@/lib/server/auth/route-helpers';

const AcademiaLoginSchema = z.object({
  email: z.string().email().max(100),
  password: z.string().min(1).max(100),
});

interface RateLimitEntry {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const existing = rateLimitMap.get(ip);
  if (existing && now < existing.resetTime) {
    existing.count += 1;
    if (existing.count > 5) {
      return { allowed: false, retryAfterMs: existing.resetTime - now };
    }
    rateLimitMap.set(ip, existing);
    return { allowed: true, retryAfterMs: 0 };
  }
  rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
  return { allowed: true, retryAfterMs: 0 };
}

export const POST = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rateLimit = checkRateLimit(clientIp);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('PARSE_FAILED', 'Invalid JSON body', 400);
  }

  const parsed = AcademiaLoginSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400);
  }

  const { email, password } = parsed.data;

  try {
    // Call the external backend (srm-api-wrapper) for Academia login
    const backendUrl = process.env.ACADEMIA_BACKEND_URL || process.env.PORTAL_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URLS || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    
    const initResp = await fetch(`${backendUrl}/api/academia/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(30000),
    });

    if (!initResp.ok) {
      const errData = await initResp.json().catch(() => ({}));
      return errorResponse(
        'PORTAL_UNAVAILABLE',
        errData.message || 'Academia login failed. Please try again.',
        initResp.status,
      );
    }

    const initData = await initResp.json();

    return NextResponse.json({
      ok: true,
      source: 'academia',
      user: {
        email,
        name: initData.user?.name || email.split('@')[0],
        academicYearLevel: initData.user?.academicYearLevel || null,
        semester: initData.user?.semester || null,
      },
      schedule: initData.schedule || {},
      attendance: initData.attendance || null,
      marks: initData.marks || null,
    });
  } catch (err) {
    console.error('Academia login error:', err);
    return errorResponse(
      'PORTAL_UNAVAILABLE',
      'Could not connect to Academia. Please try again.',
      503,
    );
  }
});
