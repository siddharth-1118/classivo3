// @ts-nocheck
import * as cheerio from "cheerio";
import type { ExamTimetableData, ExamEntry } from "../../../../src/lib/types/portal";
import {
  normalizeWs,
  parseNum,
  parseDateDMYorMDY,
  findTableHeaders,
  matchColumnIndex,
  saveDebugSnapshot,
  selectText,
} from "./parser-utils";

export const EXAM_TIMETABLE_KV = {
  academicYear: ["academic year", "session", "year", "ay"],
  semester: ["semester", "sem", "current semester"],
  examinationName: [
    "examination name",
    "exam name",
    "name of examination",
    "title",
  ],
  program: ["program", "course", "degree", "programme", "branch"],
  lastUpdated: ["last updated", "updated on", "published on", "issued on"],
} as const;

export function parseExamTimetable(html: string): ExamTimetableData {
  const $ = cheerio.load(html);
  const now = new Date().toISOString();

  saveDebugSnapshot(html, "exam-timetable").catch(() => {});

  const bodyText = normalizeWs($.root().text());

  let academicYear = "";
  let semester = 1;
  let examinationName = "";
  let program = "";
  let lastUpdated = now;

  for (const token of bodyText.split(/[.\n\r]/)) {
    const t = normalizeWs(token);
    if (!t) continue;
    const lower = t.toLowerCase();
    if (lower.includes("academic year") || lower.includes("session")) {
      const m = t.match(/(\d{4}\s*[-–]\s*\d{4}|\d{4}\/\d{2,4})/);
      if (m) {
        academicYear = m[1].replace(/\s/g, "");
        break;
      }
    }
  }

  const semRegex = /(?:semester|sem)\s*[:.]?\s*(?:[IVXLCDM0-9]+)\s*\-?\s*(\d{1,2})/i;
  const semMatch = bodyText.match(semRegex);
  if (semMatch) {
    semester = parseNum(semMatch[1], 1);
  } else {
    const looseSem = bodyText.match(/Semester\s+(\d+)/i);
    if (looseSem) semester = parseNum(looseSem[1], 1);
  }

  const examNameRegex = /(?:(?:End|Mid|Final|Supplementary|Re-sit|Re\s*-\s*sit)\s+)?(?:Semester\s+\d+\s+)?(?:Examination|Assessment|Exam)\s*(?:\s*\d{4}\s*[-–]\s*\d{2,4})?/i;
  const nameMatch = bodyText.match(examNameRegex);
  if (nameMatch) {
    examinationName = normalizeWs(nameMatch[0]);
  }

  const programRegex =
    /(?:Program|Course|Degree|Branch)\s*[:.]?\s*([^\n\r.]{3,120}?)(?:\s{2,}|\n|Semester|Academic|Examination|$)/is;
  const programMatch = bodyText.match(programRegex);
  if (programMatch) {
    program = normalizeWs(programMatch[1]).replace(/\s{2,}/g, " ");
  }

  const tables = collectExamTables($);
  const timetable: ExamEntry[] = [];

  for (const tbl of tables) {
    const rows = parseExamRows($, tbl.headers, tbl.$rows, {
      semester,
      program,
      examinationName,
    });
    timetable.push(...rows);
  }

  const instructions = extractInstructions($, bodyText);

  return {
    sourceTimestamp: now,
    lastUpdated,
    academicYear: academicYear || "TBD",
    semester: Math.max(1, semester),
    examinationName: examinationName || "Examination Timetable",
    program: program || undefined,
    timetable,
    instructions,
  };
}

interface TableInfo {
  headers: string[];
  $rows: cheerio.Cheerio<cheerio.Element>;
}

function collectExamTables($: cheerio.CheerioAPI): TableInfo[] {
  const results: TableInfo[] = [];
  $("table").each((_, tblEl) => {
    const $table = $(tblEl);
    const headers = findTableHeaders($, undefined as any);
    const headerText = headers.join(" ").toLowerCase();
    const looksLikeExamTable =
      (headerText.includes("course") ||
        headerText.includes("subject") ||
        headerText.includes("paper")) &&
      (headerText.includes("date") ||
        headerText.includes("day") ||
        headerText.includes("time") ||
        headerText.includes("venue") ||
        headerText.includes("hall"));

    if (!looksLikeExamTable) return;

    const $rows = $table.find("tr");
    const dataRows: cheerio.Element[] = [];
    $rows.each((_, rEl) => {
      const $r = $(rEl);
      if ($r.find("th").length > 0) return;
      const $tds = $r.find("td");
      if ($tds.length >= 4) {
        dataRows.push(rEl);
      }
    });
    if (dataRows.length === 0) return;

    results.push({
      headers,
      $rows: $(dataRows),
    });
  });
  return results;
}

function parseExamRows(
  $: cheerio.CheerioAPI,
  headers: string[],
  $rows: cheerio.Cheerio<cheerio.Element>,
  defaults: { semester: number; program?: string; examinationName?: string }
): ExamEntry[] {
  const results: ExamEntry[] = [];

  const codeIdx = matchColumnIndex(headers, [
    "course code",
    "subject code",
    "code",
    "paper code",
    "sub code",
  ]);
  const nameIdx = matchColumnIndex(headers, [
    "course name",
    "subject name",
    "subject",
    "course",
    "paper name",
    "title",
    "description",
    "paper title",
  ]);
  const dateIdx = matchColumnIndex(headers, [
    "exam date",
    "date",
    "day & date",
    "day and date",
    "date of exam",
  ]);
  const dayIdx = matchColumnIndex(headers, ["day", "weekday"]);
  const sessionIdx = matchColumnIndex(headers, [
    "session",
    "fn/an",
    "forenoon/afternoon",
    "forenoon / afternoon",
    "shift",
  ]);
  const timeIdx = matchColumnIndex(headers, [
    "time",
    "duration",
    "timing",
    "reporting time",
  ]);
  const venueIdx = matchColumnIndex(headers, [
    "venue",
    "hall",
    "room",
    "exam hall",
    "centre",
    "center",
    "location",
  ]);
  const seatIdx = matchColumnIndex(headers, [
    "seat no",
    "seat number",
    "hall ticket no",
    "roll no in exam",
    "seat",
  ]);
  const semesterIdx = matchColumnIndex(headers, ["semester", "sem"]);
  const remarksIdx = matchColumnIndex(headers, [
    "remarks",
    "note",
    "notes",
    "instructions",
    "comment",
  ]);
  const examTypeIdx = matchColumnIndex(headers, [
    "exam type",
    "type",
    "category",
    "nature",
  ]);

  if (codeIdx < 0 && nameIdx < 0 && dateIdx < 0) return results;

  $rows.each((_, rEl) => {
    const $r = $(rEl);
    const $tds = $r.find("td");
    if ($tds.length < 3) return;

    const cell = (idx: number): string => {
      if (idx < 0 || idx >= $tds.length) return "";
      return selectText($($tds[idx]));
    };

    const courseCode = cell(codeIdx);
    const courseName = cell(nameIdx);
    if (!courseCode && !courseName) return;

    const dateRaw = cell(dateIdx);
    if (!dateRaw && !courseCode && !courseName) return;

    const examDate = dateRaw ? parseDateDMYorMDY(dateRaw) || dateRaw : "";
    const day = cell(dayIdx);
    const rawSession = cell(sessionIdx);
    const time = cell(timeIdx) || undefined;

    let normalizedSession: string = rawSession || "FN";
    const sUpper = rawSession.toUpperCase();
    if (sUpper.includes("FORE") || sUpper.includes("MORNING") || sUpper === "FN") {
      normalizedSession = "FN";
    } else if (
      sUpper.includes("AFTER") ||
      sUpper.includes("EVENING") ||
      sUpper === "AN"
    ) {
      normalizedSession = "AN";
    } else if (sUpper) {
      normalizedSession = rawSession;
    }

    const normalizedTime =
      time || (normalizedSession === "FN" ? "09:00 AM - 12:00 PM" : "02:00 PM - 05:00 PM");

    const venue = cell(venueIdx);
    const seatNumber = cell(seatIdx) || undefined;
    const remarks = cell(remarksIdx) || undefined;

    const entrySemester =
      semesterIdx >= 0
        ? parseNum(cell(semesterIdx), 0) || defaults.semester
        : defaults.semester;

    const rawType = cell(examTypeIdx).toUpperCase();
    let examType: ExamEntry["examType"] = undefined;
    if (rawType.includes("INTERNAL") || rawType.includes("MID")) {
      examType = "INTERNAL";
    } else if (rawType.includes("EXTERNAL") || rawType.includes("END")) {
      examType = "EXTERNAL";
    } else if (rawType.includes("PRACTICAL") || rawType.includes("LAB")) {
      examType = "PRACTICAL";
    } else if (rawType.includes("VIVA") || rawType.includes("ORAL")) {
      examType = "VIVA";
    }

    results.push({
      examTitle: defaults.examinationName,
      program: defaults.program,
      semester: Math.max(1, entrySemester),
      courseCode,
      courseName: courseName || courseCode,
      examDate,
      session: normalizedSession,
      venue: venue || "TBD",
      seatNumber,
      time: normalizedTime,
      remarks: remarks || undefined,
      examType,
    });
  });

  return results;
}

function extractInstructions($: cheerio.CheerioAPI, bodyText: string): string[] {
  const instructions: string[] = [];

  const instructionSelectors = [
    "#instructions",
    ".instructions",
    ".exam-instructions",
    ".guidelines",
    ".notice",
    ".important-instructions",
    ".rules",
  ];

  for (const sel of instructionSelectors) {
    const $container = $(sel).first();
    if ($container.length === 0) continue;

    const $items = $container.find("li, p, .item");
    if ($items.length > 0) {
      $items.each((_, el) => {
        const t = normalizeWs($(el).text());
        if (t && t.length >= 8) instructions.push(t);
      });
    } else {
      const t = normalizeWs($container.text());
      if (t && t.length >= 20) {
        for (const line of t.split(/[.\n](?=\s*[A-Z0-9])/)) {
          const trimmed = normalizeWs(line).replace(/^[\d)][.\s]+/, "");
          if (trimmed.length >= 8) instructions.push(trimmed);
        }
      }
    }
    if (instructions.length > 0) break;
  }

  return instructions;
}
