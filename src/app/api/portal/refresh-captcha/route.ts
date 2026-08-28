export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  withErrorHandling,
  requireAppUser,
  successResponse,
  errorResponse,
} from '@/lib/server/auth/route-helpers';
import { SRMISTPortalProvider } from '@/lib/server/portal/srmist-provider';

const RefreshCaptchaSchema = z.object({
  requestId: z.string(),
});

export const POST = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('VALIDATION_ERROR', 'Invalid JSON body', 400);
  }

  const parsed = RefreshCaptchaSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Invalid request body',
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const provider = new SRMISTPortalProvider();
  const { requestId, captchaUrl } = await provider.refreshCaptcha(parsed.data.requestId);

  return successResponse({ requestId, captchaUrl });
});
