import * as cheerio from "cheerio";
import fs from "node:fs/promises";
import path from "node:path";

export function normalizeWs(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\s+/g, " ").trim();
}

export function parseNum(s: string | null | undefined, fallback: number = 0): number {
  if (!s) return fallback;
  const trimmed = normalizeWs(s);
  if (trimmed === "" || trimmed === "-") return fallback;
  const cleaned = trimmed.replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-") return fallback;
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? fallback : parsed;
}

export function parseDateDMYorMDY(s: string | null | undefined): string {
  if (!s) return "";
  const input = normalizeWs(s);
  if (!input) return "";

  const tryFormat = (regex: RegExp, builder: (m: RegExpMatchArray) => Date | null): string | null => {
    const match = input.match(regex);
    if (!match) return null;
    const d = builder(match);
    if (d && !isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
    return null;
  };

  const yyyyMmDd = tryFormat(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/, (m) => {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  });
  if (yyyyMmDd) return yyyyMmDd;

  const ddMmYyyy = tryFormat(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/, (m) => {
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  });
  if (ddMmYyyy) return ddMmYyyy;

  const ddMmYy = tryFormat(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/, (m) => {
    const yy = Number(m[3]);
    const year = yy >= 50 ? 1900 + yy : 2000 + yy;
    return new Date(year, Number(m[2]) - 1, Number(m[1]));
  });
  if (ddMmYy) return ddMmYy;

  const mmmDdYyyy = tryFormat(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/, (m) => {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const month = months[m[1].toLowerCase()];
    if (month === undefined) return null;
    return new Date(Number(m[3]), month, Number(m[2]));
  });
  if (mmmDdYyyy) return mmmDdYyyy;

  const ddMmmYyyy = tryFormat(/^(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})$/, (m) => {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const month = months[m[2].toLowerCase()];
    if (month === undefined) return null;
    return new Date(Number(m[3]), month, Number(m[1]));
  });
  if (ddMmmYyyy) return ddMmmYyyy;

  const native = new Date(input);
  if (!isNaN(native.getTime())) {
    return native.toISOString().split("T")[0];
  }

  return input;
}

export function findTableHeaders(
  $: cheerio.CheerioAPI,
  containerSelector?: string,
): string[] {
  const container = containerSelector ? $(containerSelector).first() : $.root();
  const tables = container.find("table, tbody");

  for (let i = 0; i < tables.length; i++) {
    const table = $(tables[i]);
    const firstRow = table.find("tr").first();
    if (firstRow.length === 0) continue;
    const headerCells = firstRow.find("th");
    if (headerCells.length > 0) {
      const headers: string[] = [];
      headerCells.each((_, cell) => {
        headers.push(normalizeWs($(cell).text()).toLowerCase());
      });
      return headers;
    }
    const tdCells = firstRow.find("td");
    if (tdCells.length > 0) {
      const text = normalizeWs(firstRow.text()).toLowerCase();
      if (
        text.includes("semester") ||
        text.includes("subject") ||
        text.includes("course") ||
        text.includes("code") ||
        text.includes("grade") ||
        text.includes("credit") ||
        text.includes("date") ||
        text.includes("venue")
      ) {
        const headers: string[] = [];
        tdCells.each((_, cell) => {
          headers.push(normalizeWs($(cell).text()).toLowerCase());
        });
        return headers;
      }
    }
  }
  return [];
}

export function matchColumnIndex(headers: readonly string[], candidates: readonly string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    for (const c of candidates) {
      if (h.includes(c.toLowerCase())) {
        return i;
      }
    }
  }
  return -1;
}

export function selectText($el: cheerio.Cheerio<any>): string {
  return normalizeWs($el.text());
}

export function loadSnapshotsEnabled(): boolean {
  const v = process.env.DEBUG_SNAPSHOTS;
  if (v === undefined) return false;
  const lower = v.toLowerCase();
  return ["true", "1", "yes", "on"].includes(lower);
}

export async function saveDebugSnapshot(
  html: string,
  pageLabel: string,
  enabled: boolean = true,
): Promise<void> {
  if (!enabled) return;
  const snapshotsEnabled = loadSnapshotsEnabled();
  if (!snapshotsEnabled) return;
  try {
    const baseDir = process.cwd();
    const debugDir = path.join(baseDir, "data", "debug");
    await fs.mkdir(debugDir, { recursive: true });
    const filename = `${pageLabel}-${Date.now()}.html`;
    const filepath = path.join(debugDir, filename);
    await fs.writeFile(filepath, html, "utf-8");
  } catch {
  }
}

export function buildKvMapFromTables($: cheerio.CheerioAPI): Record<string, string> {
  const map: Record<string, string> = {};
  $("table, tbody").each((_, tblEl) => {
    const $table = $(tblEl);
    $table.find("tr").each((_, trEl) => {
      const $tr = $(trEl);
      const $cells = $tr.find("td, th");
      if ($cells.length === 2) {
        const label = normalizeWs($($cells[0]).text()).toLowerCase().replace(/[:：]\s*$/, "");
        const value = normalizeWs($($cells[1]).text());
        if (label && value) {
          map[label] = value;
        }
      } else if ($cells.length >= 2) {
        for (let i = 0; i < $cells.length - 1; i += 2) {
          const label = normalizeWs($($cells[i]).text()).toLowerCase().replace(/[:：]\s*$/, "");
          const value = normalizeWs($($cells[i + 1]).text());
          if (label && value) {
            map[label] = value;
          }
        }
      }
    });
  });
  $("div, section, li, p").each((_, divEl) => {
    const $div = $(divEl);
    const children = $div.children();
    if (children.length === 2) {
      const $first = $(children[0]);
      const $second = $(children[1]);
      if ($first.is("label, span, b, strong, th, h1, h2, h3, h4, h5, h6")) {
        const label = normalizeWs($first.text()).toLowerCase().replace(/[:：]\s*$/, "");
        const value = selectText($second);
        if (label && value && label.length <= 60) {
          if (!(label in map)) {
            map[label] = value;
          }
        }
      }
    }
  });
  return map;
}

export function lookupKv(
  map: Record<string, string>,
  candidates: readonly string[],
): string {
  for (const c of candidates) {
    const lowerC = c.toLowerCase();
    for (const k of Object.keys(map)) {
      if (k === lowerC || k.includes(lowerC) || lowerC.includes(k)) {
        return map[k];
      }
    }
  }
  return "";
}
