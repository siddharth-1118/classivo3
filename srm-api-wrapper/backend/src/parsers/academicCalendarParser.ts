import * as cheerio from 'cheerio';

export interface CalendarEntry {
  date: string;        // "2026-10-05" (ISO)
  dateDisplay: string; // "05-10-2026" (as shown on portal)
  day: string;         // "Monday"
  status: string;      // "Working day" | "Holiday"
  week: string;        // "Wk 10"
  dayOrder: string;    // "Day 5" | "-"
  remarks: string;     // "Saturday" | "Sunday" | "Sardar Vallabhbhai" | ""
}

export interface AcademicCalendarResult {
  template: string;
  dateRange: { from: string; to: string };
  summary: {
    workingDays: number;
    holidays: number;
    totalDays: number;
  };
  entries: CalendarEntry[];
  _tablesFound: number;
  _rowsFound: number;
}

function parseDate(dateStr: string): string {
  // "05-10-2026" → "2026-10-05"
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return dateStr;
}

export function parseAcademicCalendar(html: string): AcademicCalendarResult {
  const $ = cheerio.load(html);

  const result: AcademicCalendarResult = {
    template: '',
    dateRange: { from: '', to: '' },
    summary: { workingDays: 0, holidays: 0, totalDays: 0 },
    entries: [],
    _tablesFound: 0,
    _rowsFound: 0,
  };

  // ── Extract template and date range ───────────────────────────────────
  // Look for select dropdown value or text near "TEMPLATE"
  const templateSelect = $('select').first();
  result.template = templateSelect.find('option:selected').text().trim()
    || templateSelect.find('option').first().text().trim()
    || 'FET Template';

  // Date range — look for "From" and "To" text
  const bodyText = $.text();
  const fromMatch = bodyText.match(/From\s*(\d{2}-\d{2}-\d{4})/i);
  const toMatch = bodyText.match(/To\s*(\d{2}-\d{2}-\d{4})/i);
  if (fromMatch) result.dateRange.from = fromMatch[1];
  if (toMatch) result.dateRange.to = toMatch[1];

  // ── Extract summary stats ─────────────────────────────────────────────
  // Look for "No. of Working days", "No. of Holidays", "Total days"
  const summaryText = bodyText;
  const workingDaysMatch = summaryText.match(/(\d+)\s*No\.\s*of\s*Working\s*days/i)
    || summaryText.match(/(\d+)\s*Working/i);
  const holidaysMatch = summaryText.match(/(\d+)\s*No\.\s*of\s*Holidays/i)
    || summaryText.match(/(\d+)\s*Holidays/i);
  const totalDaysMatch = summaryText.match(/(\d+)\s*Total\s*days/i)
    || summaryText.match(/(\d+)\s*Total/i);

  if (workingDaysMatch) result.summary.workingDays = parseInt(workingDaysMatch[1], 10);
  if (holidaysMatch) result.summary.holidays = parseInt(holidaysMatch[1], 10);
  if (totalDaysMatch) result.summary.totalDays = parseInt(totalDaysMatch[1], 10);

  // ── Extract calendar table ────────────────────────────────────────────
  const tables = $('table');
  result._tablesFound = tables.length;

  // Find the table with DATE/DAY/STATUS headers
  let targetTable: ReturnType<typeof $> | null = null;
  tables.each((_: number, table: any) => {
    const headers = $(table).find('th, thead td').map((_: number, th: any) => $(th).text().trim().toLowerCase()).get();
    if (headers.some(h => h.includes('date')) && headers.some(h => h.includes('status'))) {
      targetTable = $(table);
      return false; // break
    }
  });

  if (!targetTable) {
    // Fallback: find the largest table
    let maxRows = 0;
    tables.each((_: number, table: any) => {
      const rows = $(table).find('tr').length;
      if (rows > maxRows) {
        maxRows = rows;
        targetTable = $(table);
      }
    });
  }

  if (targetTable) {
    const rows = $(targetTable).find('tr');
    result._rowsFound = rows.length;

    rows.each((i: number, row: any) => {
      // Skip header row
      if (i === 0) return;

      const cells = $(row).find('td');
      if (cells.length < 4) return;

      const cellTexts = cells.map((_: number, cell: any) => $(cell).text().trim()).get();

      // Expected columns: DATE | DAY | STATUS | WEEK | DAY ORDER | REMARKS
      const entry: CalendarEntry = {
        dateDisplay: cellTexts[0] || '',
        date: parseDate(cellTexts[0] || ''),
        day: cellTexts[1] || '',
        status: cellTexts[2] || '',
        week: cellTexts[3] || '',
        dayOrder: cellTexts[4] || '-',
        remarks: cellTexts[5] || '',
      };

      // Only add valid entries (must have a date)
      if (entry.dateDisplay && /\d{2}-\d{2}-\d{4}/.test(entry.dateDisplay)) {
        result.entries.push(entry);
      }
    });
  }

  // If summary wasn't found in text, calculate from entries
  if (result.summary.totalDays === 0 && result.entries.length > 0) {
    result.summary.totalDays = result.entries.length;
    result.summary.holidays = result.entries.filter(e => e.status.toLowerCase().includes('holiday')).length;
    result.summary.workingDays = result.entries.filter(e => e.status.toLowerCase().includes('working')).length;
  }

  return result;
}
