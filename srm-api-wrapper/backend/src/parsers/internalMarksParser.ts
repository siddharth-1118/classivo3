import * as cheerio from 'cheerio';

export interface InternalMarkSubject {
  semester: string | null;
  academicYear: string | null;
  courseCode: string | null;
  courseName: string | null;
  courseType: string | null;
  faculty: string | null;
  components: Record<string, number | null>; // e.g., {"IA1": 15, "IA2": 14, "Assignment": 8}
  total: number | null;
  maxMarks: number | null;
  obtainedMarks: number | null;
  status: string | null;
  remarks: string | null;
  _raw: Record<string, string>; // preserves original columns
}

export interface ParsedInternalMarks {
  metadata: {
    semester: string | null;
    academicYear: string | null;
  };
  subjects: InternalMarkSubject[];
  tables: Array<{
    title: string | null;
    headers: string[];
    rows: Record<string, string>[];
  }>;
  _tablesFound: number;
  _rowsFound: number;
}

const INTERNAL_MATCHERS = {
  semester: ['semester', 'sem'],
  academicYear: ['academic year', 'year', 'session'],
  code: ['subject code', 'course code', 'code', 'paper code', 'sub code', 'sub.code', 'course_code', 'sub_code', 'slno', 'sl.no', 'sno'],
  name: ['subject name', 'subject', 'course name', 'description', 'title', 'paper name', 'subject title', 'course title', 'course_name', 'course'],
  courseType: ['course type', 'type', 'category', 'theory/lab', 'lab/theory'],
  faculty: ['faculty', 'faculty name', 'staff', 'instructor', 'teacher', 'professor'],
  total: ['mark / max. mark', 'mark/max. mark', 'mark / max.mark', 'mark/max.mark', 'mark / max mark', 'mark/max mark', 'mark / max', 'mark/max', 'internal marks', 'internal mark', 'total', 'obtained', 'total mark', 'total marks', 'obtained marks', 'internal total', 'tot', 'mark', 'marks'],
  maxMarks: ['max', 'max mark', 'max marks', 'maximum', 'maximum mark', 'maximum marks', 'max. marks'],
  status: ['status', 'remarks', 'remark', 'eligibility', 'result status', 'pass/fail', 'result'],
};

// Component list that we will dynamically parse if we match them in headers
const COMPONENT_KEYWORDS = {
  ia1: ['ia1', 'ia-1', 'internal assessment 1', 'assessment 1', 'cycle test 1', 'cat1', 'cat 1', 'test 1'],
  ia2: ['ia2', 'ia-2', 'internal assessment 2', 'assessment 2', 'cycle test 2', 'cat2', 'cat 2', 'test 2'],
  ia3: ['ia3', 'ia-3', 'internal assessment 3', 'assessment 3', 'cycle test 3', 'cat3', 'cat 3', 'test 3'],
  model: ['model', 'model exam', 'model marks', 'model test'],
  assignment: ['assignment', 'assign', 'assg', 'assgn', 'assignment 1', 'assignment 2'],
  quiz: ['quiz', 'quiz 1', 'quiz 2'],
  attendance: ['attendance', 'att', 'attendance mark', 'attendance marks', 'att. marks'],
};

function matchColumn(header: string, keys: string[]): boolean {
  const h = header.toLowerCase().trim();
  return keys.some(k => h.includes(k) || h === k || k === h);
}

function toNum(val: string | null | undefined): number | null {
  if (val === undefined || val === null || val.trim() === '') return null;
  const clean = val.replace(/[^0-9.]/g, '');
  if (clean === '') return null;
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

function parseSlashMarks(val: string | null | undefined): { obtained: number | null; max: number | null } {
  if (!val) return { obtained: null, max: null };
  const cleanStr = val.trim();
  if (cleanStr.includes('/')) {
    const parts = cleanStr.split('/');
    return { obtained: toNum(parts[0]), max: toNum(parts[1]) };
  }
  return { obtained: toNum(cleanStr), max: null };
}

export function parseInternalMarks(html: string): ParsedInternalMarks {
  const $ = cheerio.load(html);

  // ── Step 1: Extract all tables ──────────────────────────────────────────
  const parsedTables: Array<{ title: string | null; headers: string[]; rows: Record<string, string>[] }> = [];
  
  $('table').each((tableIdx, tableEl) => {
    const headers: string[] = [];
    const rows: Record<string, string>[] = [];

    // Check if there is a header or title above the table (e.g. card-header or card title)
    let title: string | null = null;
    const cardParent = $(tableEl).closest('.card');
    if (cardParent.length) {
      const headerText = cardParent.find('.card-header').text().trim();
      if (headerText) title = headerText.replace(/\s+/g, ' ');
    }

    let headerRow = $(tableEl).find('thead tr').first();
    if (!headerRow.length) headerRow = $(tableEl).find('tr').first();

    headerRow.find('th, td').each((_, cell) => {
      headers.push($(cell).text().trim().replace(/\s+/g, ' '));
    });

    $(tableEl).find('tbody tr, tr').each((rowIdx, trEl) => {
      if (rowIdx === 0 && !$(tableEl).find('thead').length) return;
      const cells = $(trEl).find('td');
      if (cells.length === 0) return;

      const row: Record<string, string> = {};
      cells.each((cellIdx, cellEl) => {
        const key = headers[cellIdx] || `col_${cellIdx}`;
        row[key] = $(cellEl).text().trim().replace(/\s+/g, ' ');
      });

      if (Object.values(row).some(v => v.length > 0)) {
        rows.push(row);
      }
    });

    if (headers.length > 0 || rows.length > 0) {
      parsedTables.push({ title: title || `Table ${tableIdx + 1}`, headers, rows });
    }
  });

  // ── Step 2: Extract label-value pairs for metadata ───────────────────────
  const pageText = $('body').text().replace(/\s+/g, ' ');
  const semesterMatch = pageText.match(/[Ss]emester[:\s]+([A-Za-z0-9_]+)/);
  const yearMatch = pageText.match(/[Aa]cademic\s+[Yy]ear[:\s]+([0-9\-]+)/);
  
  const semester = semesterMatch?.[1] ?? null;
  const academicYear = yearMatch?.[1] ?? null;

  // ── Step 3: Process rows from all tables that look like subject internal marks
  const subjects: InternalMarkSubject[] = [];
  let totalRowsCount = 0;

  for (const table of parsedTables) {
    const headers = table.headers;
    totalRowsCount += table.rows.length;

    // Check if this table has columns matching course code or course name
    const hasCode = headers.some(h => matchColumn(h, INTERNAL_MATCHERS.code));
    const hasName = headers.some(h => matchColumn(h, INTERNAL_MATCHERS.name));
    
    // If it doesn't look like an internal mark table, skip it
    if (!hasCode && !hasName) continue;

    // Build column map index
    const colMap: Record<keyof typeof INTERNAL_MATCHERS, number | null> = {
      semester: null, academicYear: null, code: null, name: null,
      courseType: null, faculty: null, total: null, maxMarks: null, status: null
    };

    headers.forEach((h, idx) => {
      for (const [field, keys] of Object.entries(INTERNAL_MATCHERS)) {
        if (matchColumn(h, keys) && colMap[field as keyof typeof INTERNAL_MATCHERS] === null) {
          colMap[field as keyof typeof INTERNAL_MATCHERS] = idx;
        }
      }
    });

    // Check which component columns are present in headers
    const componentCols: Array<{ key: string; idx: number }> = [];
    headers.forEach((h, idx) => {
      for (const [compKey, keys] of Object.entries(COMPONENT_KEYWORDS)) {
        if (matchColumn(h, keys)) {
          componentCols.push({ key: compKey.toUpperCase(), idx });
        }
      }
    });

    // If no component columns matched, try matching general internal marks fields
    for (const row of table.rows) {
      const getCol = (field: keyof typeof INTERNAL_MATCHERS): string | undefined => {
        const idx = colMap[field];
        if (idx === null) return undefined;
        const key = headers[idx];
        return key ? row[key] : undefined;
      };

      let code = getCol('code');
      let name = getCol('name');

      // Fallback: If code is missing, scan row cells for SRM course code pattern (e.g., 21MAB101T, 21CYB101J)
      if (!code) {
        const rowValues = Object.values(row);
        const codeCell = rowValues.find(v => /^[0-9]{2}[A-Z]{3,4}[0-9]{3}[A-Z0-9]?$/i.test(v.trim()));
        if (codeCell) code = codeCell.trim();
      }

      // Fallback: If name is missing, scan for non-numeric title cell
      if (!name) {
        const rowValues = Object.values(row);
        const nameCell = rowValues.find(v => v !== code && v.length > 3 && !v.includes('/') && !/^\d+$/.test(v) && v.toLowerCase() !== 'view');
        if (nameCell) name = nameCell.trim();
      }

      if (!code && !name) continue;

      // Skip repeated header rows
      const codeHeader = colMap.code !== null ? headers[colMap.code] : null;
      if (code && codeHeader && code === codeHeader) continue;
      const codeLower = (code || '').toLowerCase();
      if (codeLower === 'total' || codeLower === 'overall' || codeLower === 's.no' || codeLower === 'sl.no' || codeLower.includes('record')) continue;

      // Parse dynamic components
      const components: Record<string, number | null> = {};
      componentCols.forEach(({ key, idx }) => {
        const headerKey = headers[idx];
        const val = headerKey ? row[headerKey] : undefined;
        components[key] = toNum(val);
      });

      // If componentCols is empty, harvest numeric columns
      if (componentCols.length === 0) {
        headers.forEach((h, idx) => {
          const isStandard = Object.values(INTERNAL_MATCHERS).some(keys => matchColumn(h, keys));
          if (!isStandard) {
            const val = row[h];
            const num = toNum(val);
            if (num !== null) {
              components[h] = num;
            }
          }
        });
      }

      let rawTotalVal = getCol('total');
      let slashResult = parseSlashMarks(rawTotalVal);

      // Fallback: If no slash total was found in total column, scan row cells right-to-left for any slash score (e.g. 9.00 / 10.00)
      if (slashResult.obtained === null) {
        const rowValues = Object.values(row);
        for (let i = rowValues.length - 1; i >= 0; i--) {
          const cellVal = rowValues[i];
          if (cellVal && cellVal.includes('/')) {
            const res = parseSlashMarks(cellVal);
            if (res.obtained !== null) {
              slashResult = res;
              rawTotalVal = cellVal;
              break;
            }
          }
        }
      }

      const parsedTotal = slashResult.obtained !== null ? slashResult.obtained : toNum(rawTotalVal);
      const parsedMaxMarks = slashResult.max !== null ? slashResult.max : toNum(getCol('maxMarks'));

      subjects.push({
        semester: getCol('semester') || semester,
        academicYear: getCol('academicYear') || academicYear,
        courseCode: code || null,
        courseName: name || null,
        courseType: getCol('courseType') || null,
        faculty: getCol('faculty') || null,
        components,
        total: parsedTotal,
        maxMarks: parsedMaxMarks,
        obtainedMarks: parsedTotal,
        status: getCol('status') || null,
        remarks: getCol('status') || null,
        _raw: row
      });
    }
  }

  return {
    metadata: {
      semester,
      academicYear
    },
    subjects,
    tables: parsedTables,
    _tablesFound: parsedTables.length,
    _rowsFound: totalRowsCount
  };
}
