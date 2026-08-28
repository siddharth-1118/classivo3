export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/server/auth/route-helpers";
import type { GradesData, GradeRow } from "@/lib/types/portal";
import {
  fetchPortalData,
  type SnapshotDataType,
} from "../../_shared";
import { SRMISTPortalProvider } from "@/lib/server/portal/srmist-provider";

function escapeCsvValue(value: string | number | boolean | undefined | null): string {
  const str = value === undefined || value === null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function gradesToCsv(grades: GradesData, semesterFilter?: number): string {
  const header = ["Semester", "Exam Month/Year", "Code", "Title", "Credit", "Grade"];
  const rows: string[] = [];
  rows.push(header.map(escapeCsvValue).join(","));

  const gradesList: GradeRow[] = semesterFilter
    ? grades.grades.filter((g) => g.semester === semesterFilter)
    : grades.grades;

  for (const g of gradesList) {
    const row: (string | number | undefined)[] = [
      g.semester,
      g.examMonthYear,
      g.code,
      g.title,
      g.credit,
      g.grade,
    ];
    rows.push(row.map(escapeCsvValue).join(","));
  }

  return rows.join("\r\n");
}

export const GET = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  const { searchParams } = new URL(req.url);
  const semesterParam = searchParams.get("semester");
  const semesterFilter = semesterParam ? parseInt(semesterParam, 10) : undefined;

  const result = await fetchPortalData<GradesData>(
    req,
    "grades" as SnapshotDataType,
    (provider: SRMISTPortalProvider) =>
      provider.getAuthenticatedGrades.bind(provider)
  );

  if (result.response) {
    return result.response;
  }

  const grades = result.data!;
  const csv = gradesToCsv(grades, semesterFilter);
  const BOM = "\uFEFF";

  return new NextResponse(BOM + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="grades.csv"',
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
});
