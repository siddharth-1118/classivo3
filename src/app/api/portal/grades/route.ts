export const dynamic = 'force-dynamic';

import type { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/server/auth/route-helpers";
import type { GradesData } from "@/lib/types/portal";
import {
  fetchPortalDataResponse,
  type SnapshotDataType,
} from "../_shared";
import { SRMISTPortalProvider } from "@/lib/server/portal/srmist-provider";

export const GET = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  return fetchPortalDataResponse<GradesData>(
    req,
    "grades" as SnapshotDataType,
    (provider: SRMISTPortalProvider) =>
      provider.getAuthenticatedGrades.bind(provider)
  );
});
