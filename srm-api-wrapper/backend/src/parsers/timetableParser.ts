import * as cheerio from 'cheerio';

export interface TimetableSlot {
  time: string;
  course: string;
  courseCode: string;
  courseTitle: string;
  room: string;
  faculty: string;
  slot: string;
  category: string;
  period: number;
}

export interface CourseDetail {
  courseCode: string;
  courseName: string;
  credit: string;
  slot: string;
  faculty: string;
  location: string;
  building: string;
  floor: string;
  roomName: string;
}

export interface TimetableResult {
  schedule: Record<string, Record<string, TimetableSlot>>;
  semester: string;
  academicYear: string;
  section: string;
  dayNames: Record<string, string>;
  courseDetails: CourseDetail[];
  _tablesFound: number;
  _rowsFound: number;
  _diagnostics: {
    timetableTableFound: boolean;
    courseDetailsTableFound: boolean;
    periodsDetected: number;
    daysDetected: number;
    entriesExtracted: number;
    courseDetailsExtracted: number;
    unmatchedCourseCodes: string[];
  };
}

function normalizeTime(timeStr: string): string {
  // Normalize time strings like "08:00-08:50", "08:00 - 08:50"
  const cleaned = timeStr.replace(/\s+/g, '').replace(/am|pm/gi, '');
  const parts = cleaned.split(/[-–]/);
  if (parts.length === 2) {
    return `${parts[0]}-${parts[1]}`;
  }
  return timeStr.trim();
}

function extractTimeRange(text: string): string | null {
  // Match patterns like "08:00-08:50", "08:00 - 08:50", "9:00 am - 10:00 am"
  const m = text.match(/(\d{1,2}:\d{2})\s*(?:am|pm)?\s*[-–]\s*(\d{1,2}:\d{2})\s*(?:am|pm)?/i);
  if (m) {
    return normalizeTime(`${m[1]}-${m[2]}`);
  }
  return null;
}

export function parseTimetable(html: string): TimetableResult {
  const $ = cheerio.load(html);

  const result: TimetableResult = {
    schedule: {},
    semester: '',
    academicYear: '',
    section: '',
    dayNames: {},
    courseDetails: [],
    _tablesFound: 0,
    _rowsFound: 0,
    _diagnostics: {
      timetableTableFound: false,
      courseDetailsTableFound: false,
      periodsDetected: 0,
      daysDetected: 0,
      entriesExtracted: 0,
      courseDetailsExtracted: 0,
      unmatchedCourseCodes: [],
    },
  };

  // ── Extract metadata ────────────────────────────────────────────────
  const bodyText = $.text();

  // Try to find semester info
  const semMatch = bodyText.match(/(?:semester|sem)\s*[:.]?\s*(\d+)/i);
  if (semMatch) result.semester = semMatch[1];

  const yearMatch = bodyText.match(/(\d{4}\s*[-–]\s*\d{4})/);
  if (yearMatch) result.academicYear = yearMatch[1];

  const sectionMatch = bodyText.match(/(?:section)\s*[:.]?\s*([A-Z0-9]+)/i);
  if (sectionMatch) result.section = sectionMatch[1];

  // ── Find all tables ────────────────────────────────────────────────
  const tables = $('table');
  result._tablesFound = tables.length;

  console.log(`[TIMETABLE PARSER] Found ${tables.length} tables`);

  // ── Identify timetable grid table ──────────────────────────────────
  // The timetable grid has:
  // - 3 header rows (FROM, TO, Hour/Day order)
  // - Period numbers (1, 2, 3, ..., 12) in third header row
  // - Day rows (Day 1, Day 2, etc.)
  // - Course codes in cells

  let timetableTableHtml: string | null = null;
  let timeSlots: string[] = [];

  tables.each((_: number, table: any) => {
    const $table = $(table);
    const headerRows = $table.find('thead tr');
    
    // Look for table with 3+ header rows (FROM, TO, Hour/Day order)
    if (headerRows.length >= 3) {
      const thirdRow = headerRows.eq(2); // Hour/Day order row
      const thirdRowText = thirdRow.text().toLowerCase();
      
      // Check if third row contains period numbers
      if (thirdRowText.includes('hour/day order') || thirdRowText.includes('day order')) {
        // Extract time ranges from first header row
        const firstRow = headerRows.eq(0);
        const firstRowCells = firstRow.find('th');
        
        firstRowCells.each((i: number, cell: any) => {
          if (i === 0) return; // Skip "FROM" label
          const cellText = $(cell).text().trim();
          const timeRange = extractTimeRange(cellText);
          if (timeRange) {
            timeSlots.push(timeRange);
          }
        });
        
        if (timeSlots.length > 0) {
          timetableTableHtml = $.html($table);
          console.log(`[TIMETABLE PARSER] Found timetable grid with ${timeSlots.length} time slots`);
          return false; // Break loop
        }
      }
    }
  });

  // ── Identify course details table ──────────────────────────────────
  let courseDetailsTableHtml: string | null = null;

  tables.each((_: number, table: any) => {
    const $table = $(table);
    const headers = $table.find('th').map((_: number, th: any) => $(th).text().trim().toLowerCase()).get();
    
    // Course details table has specific headers
    if (headers.includes('course code') && headers.includes('course name') && 
        (headers.includes('slot') || headers.includes('credit'))) {
      courseDetailsTableHtml = $.html($table);
      console.log(`[TIMETABLE PARSER] Found course details table`);
      return false; // Break loop
    }
  });

  // ── Parse timetable grid ───────────────────────────────────────────
  if (timetableTableHtml) {
    result._diagnostics.timetableTableFound = true;
    const $timetable = cheerio.load(timetableTableHtml);
    const rows = $timetable('tbody tr');
    result._rowsFound = rows.length;

    rows.each((_: number, row: any) => {
      const $row = $timetable(row);
      const cells = $row.find('td');
      
      if (cells.length < 2) return;
      
      // First cell is the day label (e.g., "Day 1", "Day 2")
      const dayCell = $(cells[0]);
      const dayText = dayCell.text().trim();
      
      // Extract day order number
      const dayMatch = dayText.match(/day\s*(\d+)/i) || dayText.match(/^(\d+)$/);
      if (!dayMatch) return;
      
      const dayOrder = parseInt(dayMatch[1], 10);
      const dayKey = `Day ${dayOrder}`;
      
      if (!result.schedule[dayKey]) {
        result.schedule[dayKey] = {};
      }
      result.dayNames[dayKey] = dayText;
      result._diagnostics.daysDetected++;
      
      // Parse each cell (course codes)
      cells.each((j, cell) => {
        if (j === 0) return; // Skip day label column
        
        const cellText = $(cell).text().trim();
        
        // Skip empty cells or dashes
        if (!cellText || cellText === '-' || cellText.toLowerCase() === 'break' || cellText.toLowerCase() === 'lunch') {
          return;
        }
        
        // Extract course code from cell
        // The cell may contain just the course code, or code with other info
        const courseCodeMatch = cellText.match(/([A-Z0-9]{6,12})/i);
        if (!courseCodeMatch) return;
        
        const courseCode = courseCodeMatch[1];
        const period = j; // Column index = period number
        const timeSlot = timeSlots[j - 1] || `Period ${period}`;
        
        // Create timetable entry
        const entry: TimetableSlot = {
          time: timeSlot,
          course: courseCode,
          courseCode: courseCode,
          courseTitle: '', // Will be filled from course details
          room: '',
          faculty: '',
          slot: '',
          category: 'THEORY',
          period: period,
        };
        
        result.schedule[dayKey][timeSlot] = entry;
        result._diagnostics.entriesExtracted++;
      });
    });
    
    result._diagnostics.periodsDetected = timeSlots.length;
    console.log(`[TIMETABLE PARSER] Extracted ${result._diagnostics.entriesExtracted} entries from ${result._diagnostics.daysDetected} days`);
  }

  // ── Parse course details table ─────────────────────────────────────
  if (courseDetailsTableHtml) {
    result._diagnostics.courseDetailsTableFound = true;
    const $courseDetails = cheerio.load(courseDetailsTableHtml);
    const rows = $courseDetails('tbody tr');
    
    rows.each((_: number, row: any) => {
      const cells = $courseDetails(row).find('td');
      if (cells.length < 5) return;
      
      const courseCode = $(cells[0]).text().trim();
      const courseName = $(cells[1]).text().trim();
      const credit = $(cells[2]).text().trim();
      const slot = $(cells[3]).text().trim();
      const faculty = $(cells[4]).text().trim();
      const location = cells.length > 5 ? $(cells[5]).text().trim() : '';
      const building = cells.length > 6 ? $(cells[6]).text().trim() : '';
      const floor = cells.length > 7 ? $(cells[7]).text().trim() : '';
      const roomName = cells.length > 8 ? $(cells[8]).text().trim() : '';
      
      if (courseCode) {
        result.courseDetails.push({
          courseCode,
          courseName,
          credit,
          slot,
          faculty,
          location,
          building,
          floor,
          roomName,
        });
        result._diagnostics.courseDetailsExtracted++;
      }
    });
    
    console.log(`[TIMETABLE PARSER] Extracted ${result._diagnostics.courseDetailsExtracted} course details`);
  }

  // ── Join timetable entries with course details ─────────────────────
  const courseLookup: Record<string, CourseDetail> = {};
  result.courseDetails.forEach(cd => {
    courseLookup[cd.courseCode] = cd;
  });

  // Update schedule entries with course details
  for (const dayKey of Object.keys(result.schedule)) {
    for (const timeSlot of Object.keys(result.schedule[dayKey])) {
      const entry = result.schedule[dayKey][timeSlot];
      const details = courseLookup[entry.courseCode];
      
      if (details) {
        entry.courseTitle = details.courseName;
        entry.room = details.roomName || details.location;
        entry.faculty = details.faculty;
        entry.slot = details.slot;
        entry.category = details.credit && parseInt(details.credit) >= 4 ? 'THEORY' : 'LAB';
      } else {
        // Track unmatched course codes
        if (!result._diagnostics.unmatchedCourseCodes.includes(entry.courseCode)) {
          result._diagnostics.unmatchedCourseCodes.push(entry.courseCode);
        }
      }
    }
  }

  console.log(`[TIMETABLE PARSER] Diagnostics:`, result._diagnostics);

  return result;
}
