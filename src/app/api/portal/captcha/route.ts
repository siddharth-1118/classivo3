export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';
import {
  withErrorHandling,
  requireAppUser,
  successResponse,
} from '@/lib/server/auth/route-helpers';
import { SRMISTPortalProvider } from '@/lib/server/portal/srmist-provider';

export const GET = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  const provider = new SRMISTPortalProvider();
  const { requestId, captchaUrl } = await provider.initLoginSession();

  return successResponse({ requestId, captchaUrl });
});
