import * as cheerio from 'cheerio';

export interface ParsedHostelBooking {
  labelValues: Record<string, string>;
  tables: Array<{
    headers: string[];
    rows: Record<string, string>[];
  }>;
  statusText: string | null;
}

export function parseHostelBookingPage(html: string): ParsedHostelBooking {
  const $ = cheerio.load(html);
  const tables: Array<{ headers: string[]; rows: Record<string, string>[] }> = [];

  $('table').each((_, tableEl) => {
    const headers: string[] = [];
    const rows: Record<string, string>[] = [];

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
      tables.push({ headers, rows });
    }
  });

  const labelValues: Record<string, string> = {};

  $('dl').each((_, dl) => {
    const dts = $(dl).find('dt');
    const dds = $(dl).find('dd');
    dts.each((i, dt) => {
      const label = $(dt).text().trim().replace(/\s+/g, ' ').replace(/:$/, '');
      const value = $(dds.eq(i)).text().trim().replace(/\s+/g, ' ');
      if (label) labelValues[label] = value;
    });
  });

  $('label').each((_, labelEl) => {
    const labelText = $(labelEl).text().trim().replace(/\s+/g, ' ').replace(/:$/, '');
    if (!labelText) return;
    const forAttr = $(labelEl).attr('for');
    let value = '';
    if (forAttr) {
      value = $(`#${forAttr}`).val() as string || $(`#${forAttr}`).text().trim();
    }
    if (!value) {
      value = $(labelEl).next().text().trim().replace(/\s+/g, ' ');
    }
    if (labelText && value) labelValues[labelText] = value;
  });

  $('tr').each((_, trEl) => {
    const tds = $(trEl).find('td');
    if (tds.length === 2) {
      const label = tds.eq(0).text().trim().replace(/\s+/g, ' ').replace(/:$/, '');
      const value = tds.eq(1).text().trim().replace(/\s+/g, ' ');
      if (label && value && label.length < 60) {
        labelValues[label] = value;
      }
    }
  });

  $('[class*="label"], [class*="key"]').each((_, el) => {
    const label = $(el).text().trim().replace(/\s+/g, ' ').replace(/:$/, '');
    const value = $(el).next('[class*="value"], [class*="val"]').text().trim().replace(/\s+/g, ' ');
    if (label && value && label.length < 60) {
      labelValues[label] = value;
    }
  });

  let statusText: string | null = null;
  const statusSelectors = [
    '.alert', '.status', '[class*="status"]', '.alert-info', '.alert-warning', '.alert-success',
    '#status', '#message', '.message'
  ];
  for (const selector of statusSelectors) {
    const text = $(selector).first().text().trim().replace(/\s+/g, ' ');
    if (text && text.length > 5 && text.length < 1000) {
      statusText = text;
      break;
    }
  }

  return {
    labelValues,
    tables,
    statusText,
  };
}
