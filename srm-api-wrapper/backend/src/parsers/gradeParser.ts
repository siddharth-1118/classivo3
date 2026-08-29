import * as cheerio from 'cheerio';

export interface GradeCourse {
  code: string | null;
  name: string | null;
  internalMarks: number | null;
  externalMarks: number | null;
  totalMarks: number | null;
  grade: string | null;
  gradePoint: number | null;
  credits: number | null;
  status: string | null;
  courseType: string | null;
  monthYear: string | null;
  _raw: Record<string, string>; // preserves all columns
}

export interface SemesterSummary {
  totalCredits: number | null;
  sgpa: number | null;
  cgpa: number | null;
  gpa: number | null;
}

export interface ParsedSemesterGrades {
  semester: string | null;
  academicYear: string | null;
  courses: GradeCourse[];
  summary: SemesterSummary;
  semesters: Array<{
    semester: string;
    academicYear: string | null;
    courses: GradeCourse[];
    summary: SemesterSummary;
  }>;
  overallSummary: {
    cgpa: number | null;
    creditsRegistered: number | null;
    creditsEarned: number | null;
    creditsRequired: number | null;
  };
  _rawHeaders: string[];
}

const GRADE_MATCHERS = {
  semester: ['semester', 'sem'],
  monthYear: ['month / year', 'month/year', 'month', 'year', 'exam date', 'session'],
  code: ['subject code', 'course code', 'code', 'paper code', 'sub code', 'slno', 'sl.no', 'sno'],
  name: ['subject name', 'subject', 'course name', 'description', 'title', 'paper name', 'subject title', 'course title'],
  internalMarks: ['internal', 'int', 'internal mark', 'internal marks', 'cia'],
  externalMarks: ['external', 'ext', 'external mark', 'external marks', 'university exam', 'ese'],
  totalMarks: ['total', 'total mark', 'total marks', 'marks', 'tot'],
  grade: ['grade', 'letter grade', 'result', 'grade awarded', 'final grade'],
  gradePoint: ['grade point', 'grade points', 'gp', 'points'],
  credits: ['credit', 'credits', 'cr', 'total credits', 'subject credit'],
  status: ['status', 'remarks', 'remark', 'eligibility', 'result status', 'pass/fail', 'result'],
  courseType: ['course type', 'type', 'category', 'theory/lab', 'lab/theory'],
};

function matchColumn(header: string, keys: string[]): boolean {
  const h = header.toLowerCase().trim();
  return keys.some(k => h.includes(k) || h === k || k === h);
}

function scoreGradeTable(headers: string[]): number {
  let score = 0;
  for (const header of headers) {
    if (matchColumn(header, GRADE_MATCHERS.grade)) score += 3;
    if (matchColumn(header, GRADE_MATCHERS.code)) score += 2;
    if (matchColumn(header, GRADE_MATCHERS.name)) score += 2;
    if (matchColumn(header, GRADE_MATCHERS.credits)) score += 2;
    if (matchColumn(header, GRADE_MATCHERS.totalMarks)) score += 1;
    if (matchColumn(header, GRADE_MATCHERS.internalMarks)) score += 1;
    if (matchColumn(header, GRADE_MATCHERS.externalMarks)) score += 1;
  }
  return score;
}

function toNum(val: string | null | undefined): number | null {
  if (val === undefined || val === null || val.trim() === '') return null;
  const clean = val.replace(/[^0-9.]/g, '');
  if (clean === '') return null;
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

export function parseGradePage(html: string): ParsedSemesterGrades {
  const $ = cheerio.load(html);

  // ── Step 1: Find all tables on the page ──────────────────────────────────
  const tables: Array<{ headers: string[]; rawRows: any[] }> = [];

  $('table').each((_, tableEl) => {
    const headers: string[] = [];
    const rawRows: any[] = [];

    let headerRow = $(tableEl).find('thead tr').first();
    if (!headerRow.length) headerRow = $(tableEl).find('tr').first();

    headerRow.find('th, td').each((_, cell) => {
      headers.push($(cell).text().trim().replace(/\s+/g, ' '));
    });

    $(tableEl).find('tbody tr, tr').each((rowIdx, trEl) => {
      if (rowIdx === 0 && !$(tableEl).find('thead').length) return;
      rawRows.push($(trEl));
    });

    if (headers.length > 0 || rawRows.length > 0) {
      tables.push({ headers, rawRows });
    }
  });

  // ── Step 2: Score tables and locate the main grade table ─────────────────
  let bestScore = -1;
  let bestTableIdx = -1;
  tables.forEach((t, i) => {
    const score = scoreGradeTable(t.headers);
    if (score > bestScore) {
      bestScore = score;
      bestTableIdx = i;
    }
  });

  const gradeTable = bestTableIdx >= 0 ? tables[bestTableIdx] : null;

  // ── Step 3: Parse the grade table linearly to group semesters & SGPA ──────
  const pageText = $('body').text().replace(/\s+/g, ' ');
  const semMatch = pageText.match(/semester\s*:\s*(\d+)/i);
  let defaultSemester = '1';
  if (semMatch) {
    defaultSemester = semMatch[1];
  }

  const ayMatch = pageText.match(/academic\s*year\s*:\s*([\d-]+)/i);
  let defaultAcademicYear: string | null = null;
  if (ayMatch) {
    defaultAcademicYear = ayMatch[1];
  }

  const semesterMap: Map<string, { courses: GradeCourse[]; sgpa: number | null }> = new Map();
  const allCourses: GradeCourse[] = [];
  let currentSemester = defaultSemester;
  let overallCgpa: number | null = null;

  if (gradeTable) {
    const headers = gradeTable.headers;

    const colMap: Record<keyof typeof GRADE_MATCHERS, number | null> = {
      semester: null, monthYear: null, code: null, name: null, internalMarks: null,
      externalMarks: null, totalMarks: null, grade: null, gradePoint: null,
      credits: null, status: null, courseType: null,
    };

    headers.forEach((h, idx) => {
      for (const [field, keys] of Object.entries(GRADE_MATCHERS)) {
        if (matchColumn(h, keys) && colMap[field as keyof typeof GRADE_MATCHERS] === null) {
          colMap[field as keyof typeof GRADE_MATCHERS] = idx;
        }
      }
    });

    for (const tr of gradeTable.rawRows) {
      const tds = tr.find('td');
      if (tds.length === 0) continue;

      const firstTdText = tds.eq(0).text().trim();
      const firstTdTextLower = firstTdText.toLowerCase();

      // Check if it is an SGPA row
      if (firstTdTextLower.includes('sgpa') || tds.text().toLowerCase().includes('sgpa')) {
        const valText = tds.length > 1 ? tds.eq(1).text().trim() : tds.text().replace(/sgpa/i, '').trim();
        const sgpaVal = toNum(valText);
        
        const semData = semesterMap.get(currentSemester) || { courses: [], sgpa: null };
        semData.sgpa = sgpaVal;
        semesterMap.set(currentSemester, semData);
        continue;
      }

      // Check if it is a CGPA row
      if (firstTdTextLower.includes('cgpa') || tds.text().toLowerCase().includes('cgpa')) {
        const valText = tds.length > 1 ? tds.eq(1).text().trim() : tds.text().replace(/cgpa/i, '').trim();
        overallCgpa = toNum(valText);
        continue;
      }

      // Read cells as record
      const row: Record<string, string> = {};
      tds.each((cellIdx: number, cellEl: any) => {
        const key = headers[cellIdx] || `col_${cellIdx}`;
        row[key] = $(cellEl).text().trim().replace(/\s+/g, ' ');
      });

      const getCol = (field: keyof typeof GRADE_MATCHERS): string | undefined => {
        const idx = colMap[field];
        if (idx === null) return undefined;
        const key = headers[idx];
        return key ? row[key] : undefined;
      };

      const code = getCol('code');
      const name = getCol('name');
      if (!code && !name) continue;

      // Skip repeated header rows
      const codeHeader = colMap.code !== null ? headers[colMap.code] : null;
      if (code && codeHeader && code === codeHeader) continue;
      const codeLower = (code || '').toLowerCase();
      if (codeLower === 'total' || codeLower === 'overall' || codeLower === 's.no' || codeLower === 'sl.no' || codeLower.includes('record')) continue;

      const semVal = getCol('semester') || currentSemester;
      currentSemester = semVal;

      const course: GradeCourse = {
        code: code || null,
        name: name || null,
        internalMarks: toNum(getCol('internalMarks')),
        externalMarks: toNum(getCol('externalMarks')),
        totalMarks: toNum(getCol('totalMarks')),
        grade: getCol('grade') || null,
        gradePoint: toNum(getCol('gradePoint')),
        credits: toNum(getCol('credits')),
        status: getCol('status') || null,
        courseType: getCol('courseType') || null,
        monthYear: getCol('monthYear') || null,
        _raw: row,
      };

      allCourses.push(course);

      const semData = semesterMap.get(currentSemester) || { courses: [], sgpa: null };
      semData.courses.push(course);
      semesterMap.set(currentSemester, semData);
    }
  }

  // ── Step 4: Parse Credit Details table if present ────────────────────────
  let creditsRegistered: number | null = null;
  let creditsEarned: number | null = null;
  let creditsRequired: number | null = null;

  for (const t of tables) {
    const isCreditTable = t.headers.some(h => h.toLowerCase().includes('credit')) || 
                         t.rawRows.some(r => r.text().toLowerCase().includes('credits'));
    if (isCreditTable && t !== gradeTable) {
      t.rawRows.forEach(r => {
        const text = r.text().replace(/\s+/g, ' ').trim();
        const tds = r.find('td');
        if (tds.length >= 2) {
          const label = tds.eq(0).text().trim().toLowerCase();
          const val = toNum(tds.eq(1).text().trim());
          if (label.includes('registered')) creditsRegistered = val;
          else if (label.includes('earned')) creditsEarned = val;
          else if (label.includes('required')) creditsRequired = val;
        }
      });
    }
  }

  // Fallback checks for overall CGPA and SGPA from page text
  if (overallCgpa === null) {
    const cgpaMatch = pageText.match(/cgpa\s*:\s*([\d.]+)/i);
    if (cgpaMatch) {
      overallCgpa = parseFloat(cgpaMatch[1]);
    }
  }

  for (const [sem, data] of semesterMap.entries()) {
    if (data.sgpa === null) {
      const sgpaMatch = pageText.match(/sgpa\s*:\s*([\d.]+)/i);
      if (sgpaMatch) {
        data.sgpa = parseFloat(sgpaMatch[1]);
      }
    }
  }

  // Build the list of semesters structured array
  const semesters = Array.from(semesterMap.entries()).map(([sem, data]) => {
    // Total credits earned in this semester
    const totalCredits = data.courses.reduce((sum, c) => sum + (c.credits || 0), 0);
    
    return {
      semester: sem,
      academicYear: data.courses[0]?.monthYear || defaultAcademicYear,
      courses: data.courses,
      summary: {
        totalCredits,
        sgpa: data.sgpa,
        cgpa: overallCgpa,
        gpa: data.sgpa
      }
    };
  }).sort((a, b) => parseFloat(a.semester) - parseFloat(b.semester));

  // Determine overall summaries
  const latestSem = semesters[semesters.length - 1];
  const summary = latestSem ? latestSem.summary : { totalCredits: null, sgpa: null, cgpa: null, gpa: null };

  return {
    semester: latestSem?.semester || '1',
    academicYear: latestSem?.academicYear || null,
    courses: allCourses,
    summary,
    semesters,
    overallSummary: {
      cgpa: overallCgpa,
      creditsRegistered,
      creditsEarned,
      creditsRequired
    },
    _rawHeaders: gradeTable?.headers ?? [],
  };
}
