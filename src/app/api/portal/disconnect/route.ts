export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';
import {
  withErrorHandling,
  requireAppUser,
  successResponse,
} from '@/lib/server/auth/route-helpers';
import { portalSessionStore } from '@/lib/server/portal/session-store';
import {
  appendConsentLog,
  disconnectPortalConnection,
  getClientIp,
  getUserAgent,
} from '@/lib/server/db/snapshot-store';

export const POST = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  const { user, unauthorized } = await requireAppUser(req);
  if (unauthorized) return unauthorized;
  if (!user) return unauthorized!;

  const clientIp = getClientIp(req);
  const userAgent = getUserAgent(req);

  portalSessionStore.clearAuthenticatedSession(user.id);

  await disconnectPortalConnection(user.id);

  await appendConsentLog({
    userId: user.id,
    action: 'DISCONNECT',
    ip: clientIp,
    userAgent,
    success: true,
  });

  return successResponse({ disconnected: true });
});
