// @ts-nocheck
import * as cheerio from "cheerio";
import type { GradeRow, GradesData, GradesSummary } from "../../../../src/lib/types/portal";
import { GradesDataSchema } from "../../../../src/lib/schemas/portal-schemas";
import {
  normalizeWs,
  parseNum,
  findTableHeaders,
  matchColumnIndex,
  buildKvMapFromTables,
  lookupKv,
  saveDebugSnapshot,
  selectText,
} from "./parser-utils";

export const GRADE_SELECTORS = {
  gradeTable: {
    semester: ["sem", "semester"],
    examMonthYear: ["month", "month/year", "exam month", "month - year", "month and year"],
    code: ["subject code", "course code", "code", "paper code", "sub code"],
    title: ["subject name", "subject", "course name", "description", "title", "paper name", "subject title"],
    credit: ["credit", "credits", "cr", "total credits", "subject credit"],
    grade: ["grade", "letter grade", "result", "grade awarded", "final grade"],
  },
  summary: {
    cgpa: ["cgpa", "cumulative gpa", "overall gpa", "cgpa:", "overall cgpa"],
    creditsRegistered: [
      "total credits",
      "credits registered",
      "registered",
      "attempted credits",
      "total registered",
      "credits attempted",
    ],
    creditsEarned: ["earned credits", "credits earned", "earned", "total earned"],
    creditsRequired: ["credits required", "required credits", "total required", "required"],
    sgpa: ["sgpa", "semester gpa", "sem gpa", "semester grade point average"],
    academicYear: ["academic year", "year", "session", "ay"],
  },
} as const;

function collectAllGradeTables(
  $: cheerio.CheerioAPI,
): Array<{ headers: string[]; $rows: cheerio.Cheerio<cheerio.Element> }> {
  const results: Array<{ headers: string[]; $rows: cheerio.Cheerio<cheerio.Element> }> = [];
  $("table").each((_, tblEl) => {
    const $table = $(tblEl);
    const headers = findTableHeaders($, undefined as any);
    const firstHeader = headers.join(" ").toLowerCase();
    if (
      headers.length >= 3 &&
      (firstHeader.includes("sem") ||
        firstHeader.includes("grade") ||
        firstHeader.includes("credit") ||
        firstHeader.includes("subject") ||
        firstHeader.includes("course") ||
        firstHeader.includes("code"))
    ) {
      const $allRows = $table.find("tr");
      const $dataRows: cheerio.Element[] = [];
      $allRows.each((_, rEl) => {
        const $r = $(rEl);
        if ($r.find("th").length > 0) return;
        const tds = $r.find("td");
        if (tds.length >= 3) {
          $dataRows.push(rEl);
        }
      });
      if ($dataRows.length > 0) {
        results.push({
          headers,
          $rows: $($dataRows),
        });
      }
    }
  });
  if (results.length === 0) {
    const globalHeaders = findTableHeaders($, undefined as any);
    if (globalHeaders.length > 0) {
      const rows: cheerio.Element[] = [];
      $("tr").each((_, rEl) => {
        const $r = $(rEl);
        if ($r.find("th").length > 0) return;
        const tds = $r.find("td");
        if (tds.length >= 3) rows.push(rEl);
      });
      if (rows.length > 0) {
        results.push({
          headers: globalHeaders,
          $rows: $(rows),
        });
      }
    }
  }
  return results;
}

function parseRows(
  $: cheerio.CheerioAPI,
  headers: string[],
  $rows: cheerio.Cheerio<cheerio.Element>,
): GradeRow[] {
  const semesterIdx = matchColumnIndex(headers, GRADE_SELECTORS.gradeTable.semester);
  const examIdx = matchColumnIndex(headers, GRADE_SELECTORS.gradeTable.examMonthYear);
  const codeIdx = matchColumnIndex(headers, GRADE_SELECTORS.gradeTable.code);
  const titleIdx = matchColumnIndex(headers, GRADE_SELECTORS.gradeTable.title);
  const creditIdx = matchColumnIndex(headers, GRADE_SELECTORS.gradeTable.credit);
  const gradeIdx = matchColumnIndex(headers, GRADE_SELECTORS.gradeTable.grade);

  if (codeIdx < 0 && titleIdx < 0) return [];

  const results: GradeRow[] = [];
  let lastSemester = 1;
  let lastExamMonthYear = "";

  $rows.each((_, rowEl) => {
    const $row = $(rowEl);
    const $tds = $row.find("td");
    if ($tds.length < 2) return;

    const cellText = (idx: number): string => {
      if (idx < 0 || idx >= $tds.length) return "";
      return selectText($($tds[idx]));
    };

    let semesterVal = semesterIdx >= 0 ? parseNum(cellText(semesterIdx), 0) : 0;
    if (semesterVal <= 0) semesterVal = lastSemester;
    else lastSemester = semesterVal;

    let exam = examIdx >= 0 ? cellText(examIdx) : "";
    if (!exam) exam = lastExamMonthYear;
    else lastExamMonthYear = exam;

    const code = codeIdx >= 0 ? cellText(codeIdx) : "";
    const title = titleIdx >= 0 ? cellText(titleIdx) : "";
    const credit = creditIdx >= 0 ? parseNum(cellText(creditIdx), 0) : 0;
    const grade = gradeIdx >= 0 ? cellText(gradeIdx) : "";

    if (!code && !title) return;
    if (!grade && credit === 0 && !code) return;

    results.push({
      semester: Math.max(1, semesterVal),
      examMonthYear: exam,
      code,
      title,
      credit,
      grade,
    });
  });

  return results;
}

function extractSummaryFromText($: cheerio.CheerioAPI, kv: Record<string, string>): Partial<GradesSummary> & {
  semesterRows: Array<{ semester: number; sgpa: number; academicYear: string; totalCredits: number; earnedCredits: number }>;
} {
  const cgpa = parseNum(lookupKv(kv, GRADE_SELECTORS.summary.cgpa), 0);
  const creditsRegistered = parseNum(lookupKv(kv, GRADE_SELECTORS.summary.creditsRegistered), 0);
  const creditsEarned = parseNum(lookupKv(kv, GRADE_SELECTORS.summary.creditsEarned), 0);
  const creditsRequired = parseNum(lookupKv(kv, GRADE_SELECTORS.summary.creditsRequired), 0);

  const bodyText = normalizeWs($.text());
  const semesterRows: Array<{
    semester: number;
    sgpa: number;
    academicYear: string;
    totalCredits: number;
    earnedCredits: number;
  }> = [];

  const sgpaRegex = /(?:sgpa|semester\s*gpa|sem\s*gpa)\s*[:=]?\s*(\d+(?:\.\d+)?)/gi;
  const matches = bodyText.matchAll(sgpaRegex);
  const sgpaValues: number[] = [];
  for (const m of matches) {
    sgpaValues.push(parseFloat(m[1]));
  }

  const tables = collectAllGradeTables($);
  const gradeRows: GradeRow[] = [];
  for (const t of tables) gradeRows.push(...parseRows($, t.headers, t.$rows));
  const bySem = new Map<number, { total: number; earned: number; points: number }>();
  for (const g of gradeRows) {
    const s = bySem.get(g.semester) || { total: 0, earned: 0, points: 0 };
    s.total += g.credit;
    const gradeLetter = g.grade.toUpperCase().trim();
    const gradePointsMap: Record<string, number> = {
      "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "P": 4, "F": 0, "RA": 0, "AB": 0, "U": 0,
    };
    let gp = 0;
    for (const [k, v] of Object.entries(gradePointsMap)) {
      if (gradeLetter.includes(k)) {
        gp = Math.max(gp, v);
        break;
      }
    }
    if (gp > 0) {
      s.earned += g.credit;
      s.points += g.credit * gp;
    }
    bySem.set(g.semester, s);
  }

  let sgpaIdx = 0;
  const sortedSemKeys = Array.from(bySem.keys()).sort((a, b) => a - b);
  for (const semKey of sortedSemKeys) {
    const data = bySem.get(semKey)!;
    const sgpa = sgpaValues[sgpaIdx] ?? (data.total > 0 ? data.points / data.total : 0);
    sgpaIdx++;
    semesterRows.push({
      semester: semKey,
      sgpa: Math.round(sgpa * 100) / 100,
      academicYear: "",
      totalCredits: data.total,
      earnedCredits: data.earned,
    });
  }

  return {
    cgpa,
    creditsRegistered,
    creditsEarned,
    creditsRequired,
    semesterRows,
  };
}

export function parseGrades(html: string): GradesData {
  const $ = cheerio.load(html);
  const now = new Date().toISOString();

  saveDebugSnapshot(html, "grades").catch(() => {});

  const kv = buildKvMapFromTables($);
  const tables = collectAllGradeTables($);

  const grades: GradeRow[] = [];
  for (const t of tables) {
    const rows = parseRows($, t.headers, t.$rows);
    grades.push(...rows);
  }

  const extracted = extractSummaryFromText($, kv);
  const { semesterRows } = extracted;

  let cgpa = extracted.cgpa || 0;
  let creditsRegistered = extracted.creditsRegistered || 0;
  let creditsEarned = extracted.creditsEarned || 0;
  const creditsRequired = extracted.creditsRequired > 0 ? extracted.creditsRequired : 160;

  if (creditsRegistered === 0 && semesterRows.length > 0) {
    creditsRegistered = semesterRows.reduce((s, r) => s + r.totalCredits, 0);
  }
  if (creditsEarned === 0 && semesterRows.length > 0) {
    creditsEarned = semesterRows.reduce((s, r) => s + r.earnedCredits, 0);
  }
  if (cgpa === 0 && semesterRows.length > 0) {
    let totalWt = 0;
    let totalPts = 0;
    for (const sr of semesterRows) {
      if (sr.sgpa > 0 && sr.totalCredits > 0) {
        totalWt += sr.totalCredits;
        totalPts += sr.sgpa * sr.totalCredits;
      }
    }
    if (totalWt > 0) {
      cgpa = Math.round((totalPts / totalWt) * 100) / 100;
    }
  }

  if (grades.length === 0) {
    $("table tr").each((_, rEl) => {
      const $r = $(rEl);
      if ($r.find("th").length > 0) return;
      const $tds = $r.find("td");
      if ($tds.length >= 5) {
        const texts: string[] = [];
        $tds.each((_, td) => texts.push(selectText($(td))));
        let semester = 1;
        let exam = "";
        let code = "";
        let title = "";
        let credit = 0;
        let grade = "";
        let matchedAny = false;
        for (let i = 0; i < texts.length; i++) {
          const t = texts[i];
          const lower = t.toLowerCase();
          if (i < 3 && /^(sem|semester)?\s*\d+$/i.test(t)) {
            semester = parseNum(t, 1);
            matchedAny = true;
          } else if (t.includes("/") && /[A-Za-z]/.test(t) && /\d/.test(t) && lower.length < 30) {
            exam = t;
            matchedAny = true;
          } else if (/^[A-Z]{2,4}\d+/.test(t) || /^\d{2,}[A-Z]+\d+/.test(t)) {
            code = t;
            matchedAny = true;
          } else if (i < texts.length - 1 && parseNum(texts[i + 1], -1) > 0 && parseNum(texts[i + 1], -1) < 15) {
            title = t;
            credit = parseNum(texts[i + 1], 0);
            grade = texts[i + 2] || "";
            matchedAny = true;
            break;
          }
        }
        if ((code || title) && matchedAny) {
          grades.push({ semester, examMonthYear: exam, code, title, credit, grade });
        }
      }
    });
  }

  const result: GradesData = {
    sourceTimestamp: now,
    grades,
    summary: {
      cgpa,
      creditsRegistered,
      creditsEarned,
      creditsRequired,
    },
    semesters: semesterRows,
  };

  const parsed = GradesDataSchema.safeParse(result);
  if (parsed.success) {
    return parsed.data;
  }
  return result;
}
