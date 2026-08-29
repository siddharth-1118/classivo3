import * as cheerio from 'cheerio';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AttendanceSubject {
  courseCode: string | null;
  courseName: string | null;
  courseType: string | null;   // THEORY / LAB / PRACTICAL etc
  faculty: string | null;
  classesHeld: number | null;
  classesAttended: number | null;
  percentage: number | null;
  status: string | null;
  _raw: Record<string, string>; // all raw column values preserved
}

export interface AttendanceMeta {
  semester: string | null;
  academicYear: string | null;
  section: string | null;
  batch: string | null;
  dateRange: string | null;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface ParsedAttendance {
  metadata: AttendanceMeta;
  overallPercentage: number | null;
  totalHeld: number | null;
  totalAttended: number | null;
  subjects: AttendanceSubject[];
  
  // Expanded fields
  courseWiseChart: { courseCode: string; percentage: number | null }[];
  attendanceHours: { presentHours: number | null; absentHours: number | null };
  courseWiseAttendance: Array<{
    code: string | null;
    description: string | null;
    maxHours: number | null;
    attendanceHours: number | null;
    absentHours: number | null;
    totalPercentage: number | null;
    additionalFields: Record<string, string>;
  }>;
  cumulativeAttendance: Array<{
    monthYear: string | null;
    present: number | null;
    absent: number | null;
  }>;

  // Debug fields
  _tablesFound: number;
  _rowsFound: number;
  _scoredTableIndex: number;
  _rawHeaders: string[];
}

// ─── Column matchers ──────────────────────────────────────────────────────────

const MATCHERS = {
  courseCode: ['course code', 'code', 'course no', 'courseno', 'subject code', 'sub code', 'slno', 'sl.no', 's.no', 'sno'],
  courseName: ['course title', 'course name', 'subject name', 'subject title', 'title', 'course', 'subject', 'description'],
  courseType: ['course type', 'type', 'category', 'theory/lab', 'lab/theory', 'course category'],
  faculty:    ['faculty', 'faculty name', 'staff', 'instructor', 'teacher', 'professor'],
  classesHeld: ['classes held', 'held', 'total classes', 'classes conducted', 'conducted', 'max', 'total', 'max. hours'],
  classesAttended: ['classes attended', 'attended', 'present', 'actual attendance', 'actual', 'att. hours'],
  percentage: ['percentage', 'attendance %', '% of attendance', 'att %', 'att%', '%', 'percent', 'total percentage'],
  status: ['status', 'remarks', 'remark', 'eligibility', 'eligibility status', 'detention status'],
};

function matchColumn(header: string, keys: string[]): boolean {
  const h = header.toLowerCase().trim();
  return keys.some(k => h.includes(k));
}

function scoreTable(headers: string[]): number {
  let score = 0;
  for (const header of headers) {
    if (matchColumn(header, MATCHERS.classesHeld)) score += 3;
    if (matchColumn(header, MATCHERS.classesAttended)) score += 3;
    if (matchColumn(header, MATCHERS.percentage)) score += 2;
    if (matchColumn(header, MATCHERS.courseCode)) score += 2;
    if (matchColumn(header, MATCHERS.courseName)) score += 2;
    if (matchColumn(header, MATCHERS.faculty)) score += 1;
    if (matchColumn(header, MATCHERS.status)) score += 1;
  }
  return score;
}

// ─── Number parser ────────────────────────────────────────────────────────────

function toNum(val: string | undefined): number | null {
  if (val === undefined || val === null || val.trim() === '') return null;
  const clean = val.replace(/[^0-9.]/g, '');
  if (clean === '') return null;
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

// ─── Chart parsing helpers ───────────────────────────────────────────────────

function parseHoursChart(html: string): { presentHours: number | null; absentHours: number | null } {
  const regex = /myPieChart[\s\S]+?data:\s*\[\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\]/;
  const match = html.match(regex);
  if (match) {
    return {
      presentHours: parseFloat(match[1]),
      absentHours: parseFloat(match[2]),
    };
  }
  return { presentHours: null, absentHours: null };
}

function parseBarChart(html: string): { courseCode: string; percentage: number | null }[] {
  const labelsRegex = /myBarChart[\s\S]+?labels:\s*\[([\s\S]+?)\]/;
  const dataRegex = /myBarChart[\s\S]+?data:\s*\[([\s\S]+?)\]/;
  const labelsMatch = html.match(labelsRegex);
  const dataMatch = html.match(dataRegex);

  if (labelsMatch && dataMatch) {
    const labels = labelsMatch[1]
      .split(',')
      .map(s => s.trim().replace(/['"']/g, ''))
      .filter(Boolean);
    const data = dataMatch[1]
      .split(',')
      .map(s => parseFloat(s.trim()))
      .filter(val => !isNaN(val));

    return labels.map((label, idx) => ({
      courseCode: label,
      percentage: data[idx] ?? null
    }));
  }
  return [];
}

// ─── Metadata extractor ───────────────────────────────────────────────────────

function extractMetadata($: cheerio.CheerioAPI): AttendanceMeta {
  const pageText = $('body').text().replace(/\s+/g, ' ');

  const semesterMatch = pageText.match(/[Ss]emester[:\s]+([A-Za-z0-9_ ]+?)(?:\s*(?:[\|,\-\n]|\s{2}|$))/);
  const yearMatch = pageText.match(/[Aa]cademic\s+[Yy]ear[:\s]+([0-9\-]+)/);
  const sectionMatch = pageText.match(/[Ss]ection[:\s]+([A-Za-z0-9_]+)/);
  const batchMatch = pageText.match(/[Bb]atch[:\s]+([A-Za-z0-9_ ]+?)(?:\s*(?:[\|,\-\n]|\s{2}|$))/);
  const dateMatch = pageText.match(/\d{2}[\/\-]\d{2}[\/\-]\d{4}\s*[-–to]+\s*\d{2}[\/\-]\d{2}[\/\-]\d{4}/);

  // Also check label-value pairs (th/td or label/span)
  const labelValues: Record<string, string> = {};
  $('tr').each((_, tr) => {
    const tds = $(tr).find('td, th');
    if (tds.length >= 2) {
      const k = tds.eq(0).text().trim().toLowerCase();
      const v = tds.eq(1).text().trim();
      if (k && v) labelValues[k] = v;
    }
  });

  const findLabel = (keys: string[]) =>
    Object.entries(labelValues).find(([k]) => keys.some(kw => k.includes(kw)))?.[1] || null;

  return {
    semester:     findLabel(['semester', 'sem']) || (semesterMatch?.[1]?.trim() ?? null),
    academicYear: findLabel(['academic year', 'year']) || (yearMatch?.[1]?.trim() ?? null),
    section:      findLabel(['section']) || (sectionMatch?.[1]?.trim() ?? null),
    batch:        findLabel(['batch']) || (batchMatch?.[1]?.trim() ?? null),
    dateRange:    dateMatch?.[0]?.trim() ?? null,
    periodStart:  null,
    periodEnd:    null,
  };
}

// ─── Main parse function ──────────────────────────────────────────────────────

export function parseAttendance(html: string): ParsedAttendance {
  const $ = cheerio.load(html);

  // ── Step 1: Extract all tables with their headers ────────────────────────
  const tables: Array<{ headers: string[]; rows: Record<string, string>[] }> = [];

  $('table').each((_, tableEl) => {
    const headers: string[] = [];
    const rows: Record<string, string>[] = [];

    // Headers from thead first, then first tr if no thead
    let headerRow = $(tableEl).find('thead tr').first();
    if (!headerRow.length) headerRow = $(tableEl).find('tr').first();

    headerRow.find('th, td').each((_, cell) => {
      headers.push($(cell).text().trim().replace(/\s+/g, ' '));
    });

    $(tableEl).find('tbody tr, tr').each((rowIdx, trEl) => {
      // Skip the header row if no thead
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
      tables.push({ headers, rows });
    }
  });

  // ── Step 2: Score each table and pick the best attendance table ──────────
  let bestScore = -1;
  let bestTableIdx = -1;
  tables.forEach((t, i) => {
    const score = scoreTable(t.headers);
    if (score > bestScore) {
      bestScore = score;
      bestTableIdx = i;
    }
  });

  const attendanceTable = bestTableIdx >= 0 ? tables[bestTableIdx] : null;
  const totalRows = tables.reduce((s, t) => s + t.rows.length, 0);

  // ── Step 3: Map columns to normalized fields ─────────────────────────────
  const subjects: AttendanceSubject[] = [];
  let overallPercentage: number | null = null;
  let totalHeld: number | null = null;
  let totalAttended: number | null = null;

  if (attendanceTable) {
    const headers = attendanceTable.headers;

    // Build column index map
    const colMap: Record<keyof typeof MATCHERS, number | null> = {
      courseCode: null, courseName: null, courseType: null,
      faculty: null, classesHeld: null, classesAttended: null,
      percentage: null, status: null,
    };

    headers.forEach((h, idx) => {
      let bestField: keyof typeof MATCHERS | null = null;
      let bestMatchLength = -1;

      for (const [field, keys] of Object.entries(MATCHERS)) {
        for (const key of keys) {
          const lowerH = h.toLowerCase().trim();
          if (lowerH === key) {
            bestField = field as keyof typeof MATCHERS;
            bestMatchLength = key.length + 1000;
            break;
          } else if (lowerH.includes(key)) {
            if (key.length > bestMatchLength) {
              bestField = field as keyof typeof MATCHERS;
              bestMatchLength = key.length;
            }
          }
        }
      }

      if (bestField && colMap[bestField] === null) {
        colMap[bestField] = idx;
      }
    });

    let sumHeld = 0, sumAttended = 0, hasNumbers = false;

    for (const row of attendanceTable.rows) {
      const getCol = (field: keyof typeof MATCHERS): string | undefined => {
        const idx = colMap[field];
        if (idx === null) return undefined;
        const key = headers[idx];
        return key ? row[key] : undefined;
      };

      const heldRaw     = getCol('classesHeld');
      const attendedRaw = getCol('classesAttended');
      const pctRaw      = getCol('percentage');
      const held        = toNum(heldRaw);
      const attended    = toNum(attendedRaw);
      const pct         = toNum(pctRaw);

      // Skip summary/total rows
      const code = getCol('courseCode');
      const name = getCol('courseName');
      if (!code && !name) continue;

      // Skip repeated header rows
      const codeHeader = colMap.courseCode !== null ? headers[colMap.courseCode] : null;
      if (code && codeHeader && code === codeHeader) continue;
      const nameHeader = colMap.courseName !== null ? headers[colMap.courseName] : null;
      if (name && nameHeader && name === nameHeader) continue;

      const codeLower = (code || '').toLowerCase();
      if (codeLower === 'total' || codeLower === 'overall' || codeLower === 's.no' || codeLower === 'sl.no') continue;

      if (held !== null && attended !== null) {
        sumHeld += held;
        sumAttended += attended;
        hasNumbers = true;
      }

      let finalPct = pct;
      if (finalPct === null && pctRaw === undefined && held !== null && attended !== null && held > 0) {
        finalPct = Math.round((attended / held) * 1000) / 10;
      }

      subjects.push({
        courseCode:      code || null,
        courseName:      getCol('courseName') || null,
        courseType:      getCol('courseType') || null,
        faculty:         getCol('faculty') || null,
        classesHeld:     held,
        classesAttended: attended,
        percentage:      finalPct,
        status:          getCol('status') || null,
        _raw:            row,
      });
    }

    // Look for a total/overall row
    for (const row of attendanceTable.rows) {
      const vals = Object.values(row).map(v => v.toLowerCase());
      if (vals.some(v => v === 'total' || v === 'overall')) {
        const pctIdx = colMap['percentage'];
        if (pctIdx !== null) {
          const pctKey = headers[pctIdx];
          overallPercentage = toNum(pctKey ? row[pctKey] : undefined);
        }
        const heldIdx = colMap['classesHeld'];
        const attendedIdx = colMap['classesAttended'];
        if (heldIdx !== null) totalHeld = toNum(headers[heldIdx] ? row[headers[heldIdx]] : undefined);
        if (attendedIdx !== null) totalAttended = toNum(headers[attendedIdx] ? row[headers[attendedIdx]] : undefined);
        break;
      }
    }

    // Calculate overall from raw numbers if not explicitly found
    if (overallPercentage === null && hasNumbers && sumHeld > 0) {
      overallPercentage = Math.round((sumAttended / sumHeld) * 1000) / 10;
      totalHeld = sumHeld;
      totalAttended = sumAttended;
    }
  }

  // ── Step 4: Extract page metadata ────────────────────────────────────────
  const metadata = extractMetadata($);

  // Parse Period
  const periodMatch = html.match(/Period:\s*<b>([^<]+)<\/b>\s*To\s*<b>([^<]+)<\/b>/i);
  const periodStart = periodMatch ? periodMatch[1].trim() : null;
  const periodEnd = periodMatch ? periodMatch[2].trim() : null;
  metadata.periodStart = periodStart;
  metadata.periodEnd = periodEnd;

  // ── Step 5: Parse Charts ─────────────────────────────────────────────────
  const attendanceHours = parseHoursChart(html);
  const courseWiseChart = parseBarChart(html);

  // ── Step 6: Parse Cumulative Attendance ──────────────────────────────────
  const cumulativeTable = tables.find(t =>
    t.headers.some(h => h.toLowerCase().includes('month')) &&
    t.headers.some(h => h.toLowerCase().includes('present'))
  );
  
  const cumulativeAttendance = cumulativeTable
    ? cumulativeTable.rows.map(row => {
        const mKey = cumulativeTable.headers.find(h => h.toLowerCase().includes('month')) || 'Month / Year';
        const pKey = cumulativeTable.headers.find(h => h.toLowerCase().includes('present')) || 'Present';
        const aKey = cumulativeTable.headers.find(h => h.toLowerCase().includes('absent')) || 'Absent';
        
        return {
          monthYear: row[mKey] || null,
          present: toNum(row[pKey]),
          absent: toNum(row[aKey])
        };
      })
    : [];

  return {
    metadata,
    overallPercentage,
    totalHeld,
    totalAttended,
    subjects,

    // Expanded properties
    courseWiseChart,
    attendanceHours,
    courseWiseAttendance: subjects.map(s => {
      const additionalFields: Record<string, string> = {};
      Object.entries(s._raw).forEach(([k, v]) => {
        const lowerK = k.toLowerCase();
        const isStandard = ['code', 'desc', 'max', 'att', 'absent', 'percent'].some(term => lowerK.includes(term));
        if (!isStandard) {
          additionalFields[k] = v;
        }
      });
      return {
        code: s.courseCode,
        description: s.courseName,
        maxHours: s.classesHeld,
        attendanceHours: s.classesAttended,
        absentHours: s.classesHeld !== null && s.classesAttended !== null ? s.classesHeld - s.classesAttended : null,
        totalPercentage: s.percentage,
        additionalFields
      };
    }),
    cumulativeAttendance,

    _tablesFound: tables.length,
    _rowsFound: totalRows,
    _scoredTableIndex: bestTableIdx,
    _rawHeaders: attendanceTable?.headers ?? [],
  };
}
