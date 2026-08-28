export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';
import {
  withErrorHandling,
  requireAppUser,
  successResponse,
} from '@/lib/server/auth/route-helpers';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, revokeSession, clearSessionCookie } from '@/lib/server/auth/session';

export const POST = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  const { user, unauthorized } = await requireAppUser(req);
  if (unauthorized) return unauthorized;

  if (user) {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await revokeSession(token);
    }
  }

  const response = successResponse({ loggedOut: true });
  await clearSessionCookie(response);
  return response;
});
