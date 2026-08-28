import crypto from 'crypto';
import { cookies } from 'next/headers';
type User = { id: string; email: string; name?: string | null; createdAt: Date; updatedAt: Date };
type SessionMetadata = { id: string; userId: string; token: string; createdAt: Date; expiresAt: Date };
import { prisma } from '@/lib/server/db/prisma';

export const SESSION_COOKIE_NAME = process.env.APP_AUTH_COOKIE_NAME ?? 'app_session';

const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_TTL_MS: number = process.env.SESSION_TTL_MS
  ? Number(process.env.SESSION_TTL_MS)
  : DEFAULT_SESSION_TTL_MS;

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export interface CreateSessionOptions {
  ip?: string;
  userAgent?: string;
}

export async function createAppSession(
  userId: string,
  opts: CreateSessionOptions = {},
): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.sessionMetadata.create({
    data: {
      sessionToken: token,
      userId,
      expiresAt,
      ip: opts.ip,
      userAgent: opts.userAgent,
    },
  });

  return token;
}

type SessionWithUser = (SessionMetadata & { user: User | null }) | null;

export async function getSessionFromToken(token: string): Promise<SessionWithUser> {
  const session = await prisma.sessionMetadata.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.revoked) return null;
  if (session.expiresAt < new Date()) return null;

  return session;
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.sessionMetadata.updateMany({
    where: { sessionToken: token },
    data: { revoked: true },
  });
}

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge: number;
  domain?: string;
}

export function getCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    domain: process.env.APP_COOKIE_DOMAIN,
  };
}

export async function setSessionCookie(_res: unknown, token: string): Promise<void> {
  const opts = getCookieOptions();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, opts);
}

export async function clearSessionCookie(_res?: unknown): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
