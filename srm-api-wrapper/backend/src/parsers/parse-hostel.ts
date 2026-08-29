// @ts-nocheck
import * as cheerio from "cheerio";
import type {
  HostelData,
  HostelInfo,
  HostelAllotment,
  HostelPayment,
  HostelBooking,
} from "../../../../src/lib/types/portal";
import { HostelDataSchema } from "../../../../src/lib/schemas/portal-schemas";
import {
  normalizeWs,
  parseNum,
  parseDateDMYorMDY,
  findTableHeaders,
  matchColumnIndex,
  buildKvMapFromTables,
  lookupKv,
  saveDebugSnapshot,
  selectText,
} from "./parser-utils";

export const HOSTEL_SELECTORS = {
  kv: {
    academicYear: ["academic year", "session", "ay"],
    hostelName: ["hostel name", "hostel", "hostel block name", "hall of residence"],
    roomNo: ["room no", "room number", "room"],
    block: ["block", "hostel block", "block name"],
    floor: ["floor"],
    bedNo: ["bed no", "bed number", "bed"],
    allotmentDate: ["allotment date", "date of allotment", "allocated on", "allotted on"],
    feeAmount: ["fee amount", "total fee", "amount", "hostel fee", "total hostel fee"],
    payMode: ["payment mode", "pay mode", "mode of payment"],
  },
  paymentTable: {
    academicYear: ["academic year", "session", "year"],
    feeAmount: ["amount", "fee amount", "total", "fee", "total amount"],
    feeDescription: ["description", "particulars", "fee description", "head of account"],
    payMode: ["payment mode", "mode of payment", "pay mode", "paid via"],
    transactionId: ["transaction id", "txn id", "reference no", "utr no"],
    paymentDate: ["payment date", "paid on", "paid date", "date of payment"],
    dueDate: ["due date", "last date", "payable by"],
    status: ["status", "payment status", "paid/unpaid"],
    receiptNumber: ["receipt no", "receipt number", "challan no"],
  },
  allotmentTable: {
    academicYear: ["academic year", "session", "year"],
    hostelName: ["hostel name", "hostel", "hall name"],
    roomNo: ["room no", "room number", "room"],
    block: ["block", "block name", "hostel block"],
    floor: ["floor"],
    bedNo: ["bed no", "bed number", "bed"],
    allotmentDate: ["allotment date", "allocated on", "date of allotment"],
    roomType: ["room type", "type", "accommodation type"],
    messPreference: ["mess preference", "mess", "food preference"],
    status: ["status", "allotment status"],
    bookingStage: ["booking stage", "stage", "application stage"],
  },
} as const;

function detectLinkAvailable($: cheerio.CheerioAPI, keywords: string[]): boolean {
  let found = false;
  $("a, button, input, div, span").each((_, el) => {
    if (found) return;
    const $el = $(el);
    const text = selectText($el).toLowerCase();
    const title = ($el.attr("title") || "").toLowerCase();
    const id = ($el.attr("id") || "").toLowerCase();
    const cls = ($el.attr("class") || "").toLowerCase();
    const href = ($el.attr("href") || "").toLowerCase();
    const haystack = [text, title, id, cls, href].join(" ");
    for (const kw of keywords) {
      if (haystack.includes(kw.toLowerCase())) {
        const tag = $el.get(0)?.tagName || "";
        if (["a", "button"].includes(tag)) {
          found = true;
          return;
        }
        if (text.includes("available") || text.includes("download")) {
          found = true;
          return;
        }
      }
    }
  });
  return found;
}

function parseAllPayments(
  $: cheerio.CheerioAPI,
  fallbackAcademicYear: string,
): HostelPayment[] {
  const results: HostelPayment[] = [];
  $("table").each((_, tblEl) => {
    const $table = $(tblEl);
    const headers = findTableHeaders($, undefined as any);
    const headersText = headers.join(" ").toLowerCase();
    const isPaymentTable =
      headersText.includes("amount") ||
      headersText.includes("fee") ||
      headersText.includes("payment") ||
      headersText.includes("paid") ||
      headersText.includes("receipt");
    if (!isPaymentTable) return;

    const acYearIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.paymentTable.academicYear);
    const amountIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.paymentTable.feeAmount);
    const descIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.paymentTable.feeDescription);
    const payModeIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.paymentTable.payMode);
    const txnIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.paymentTable.transactionId);
    const payDateIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.paymentTable.paymentDate);
    const dueDateIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.paymentTable.dueDate);
    const statusIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.paymentTable.status);
    const receiptIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.paymentTable.receiptNumber);

    if (amountIdx < 0 && descIdx < 0) return;

    $table.find("tr").each((_, rEl) => {
      const $r = $(rEl);
      if ($r.find("th").length > 0) return;
      const $tds = $r.find("td");
      if ($tds.length < 2) return;

      const cell = (idx: number): string => {
        if (idx < 0 || idx >= $tds.length) return "";
        return selectText($($tds[idx]));
      };
      const academicYear = cell(acYearIdx) || fallbackAcademicYear;
      const feeAmount = parseNum(cell(amountIdx), 0);
      const feeDescription = cell(descIdx) || "Hostel Fee";
      const payMode = cell(payModeIdx);
      const transactionId = cell(txnIdx) || undefined;
      const paymentDateRaw = cell(payDateIdx);
      const paymentDate = paymentDateRaw ? parseDateDMYorMDY(paymentDateRaw) || undefined : undefined;
      const dueDateRaw = cell(dueDateIdx);
      const dueDate = dueDateRaw ? parseDateDMYorMDY(dueDateRaw) || undefined : undefined;
      const statusRaw = cell(statusIdx).toLowerCase();
      let status: HostelPayment["status"] = "Unpaid";
      if (statusRaw.includes("paid") && !statusRaw.includes("unpaid") && !statusRaw.includes("partial")) status = "Paid";
      else if (statusRaw.includes("partial")) status = "Partial";
      const receiptNumber = cell(receiptIdx) || undefined;

      if (feeAmount === 0 && !feeDescription.replace(/hostel/gi, "").trim()) return;

      results.push({
        academicYear,
        feeAmount,
        feeDescription,
        payMode,
        transactionId,
        paymentDate,
        dueDate,
        status,
        receiptNumber,
      });
    });
  });
  return results;
}

function parseAllAllotments(
  $: cheerio.CheerioAPI,
  fallbackAcademicYear: string,
): HostelAllotment[] {
  const results: HostelAllotment[] = [];
  $("table").each((_, tblEl) => {
    const $table = $(tblEl);
    const headers = findTableHeaders($, undefined as any);
    const headersText = headers.join(" ").toLowerCase();
    const isAllotTable =
      headersText.includes("room") ||
      headersText.includes("hostel") ||
      headersText.includes("allotment") ||
      headersText.includes("allotted") ||
      headersText.includes("bed");
    if (!isAllotTable) return;

    const isPayment = headersText.includes("amount") || headersText.includes("fee") || headersText.includes("receipt");
    if (isPayment) return;

    const acYearIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.allotmentTable.academicYear);
    const hostelIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.allotmentTable.hostelName);
    const roomIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.allotmentTable.roomNo);
    const blockIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.allotmentTable.block);
    const floorIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.allotmentTable.floor);
    const bedIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.allotmentTable.bedNo);
    const dateIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.allotmentTable.allotmentDate);
    const roomTypeIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.allotmentTable.roomType);
    const messIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.allotmentTable.messPreference);
    const statusIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.allotmentTable.status);
    const stageIdx = matchColumnIndex(headers, HOSTEL_SELECTORS.allotmentTable.bookingStage);

    if (roomIdx < 0 && hostelIdx < 0) return;

    $table.find("tr").each((_, rEl) => {
      const $r = $(rEl);
      if ($r.find("th").length > 0) return;
      const $tds = $r.find("td");
      if ($tds.length < 2) return;
      const cell = (idx: number): string => {
        if (idx < 0 || idx >= $tds.length) return "";
        return selectText($($tds[idx]));
      };
      const academicYear = cell(acYearIdx) || fallbackAcademicYear;
      const hostelName = cell(hostelIdx);
      const roomNo = cell(roomIdx);
      const block = cell(blockIdx) || undefined;
      const floor = cell(floorIdx) || undefined;
      const bedNo = cell(bedIdx) || undefined;
      const dateRaw = cell(dateIdx);
      const allotmentDate = dateRaw ? parseDateDMYorMDY(dateRaw) || "" : "";
      const roomType = cell(roomTypeIdx) || undefined;
      const messPreference = cell(messIdx) || undefined;
      const status = cell(statusIdx) || "Allotted";
      const bookingStage = cell(stageIdx) || undefined;

      if (!hostelName && !roomNo) return;

      results.push({
        academicYear,
        hostelName,
        roomNo,
        block,
        floor,
        bedNo,
        allotmentDate,
        roomType,
        messPreference,
        status,
        bookingStage,
      });
    });
  });
  return results;
}

export function parseHostel(html: string): HostelData {
  const $ = cheerio.load(html);
  const now = new Date().toISOString();

  saveDebugSnapshot(html, "hostel").catch(() => {});

  const kv = buildKvMapFromTables($);
  const lookup = (candidates: string[]): string => lookupKv(kv, candidates);

  const academicYear = lookup(HOSTEL_SELECTORS.kv.academicYear);
  const hostelName = lookup(HOSTEL_SELECTORS.kv.hostelName);
  const roomNo = lookup(HOSTEL_SELECTORS.kv.roomNo);
  const block = lookup(HOSTEL_SELECTORS.kv.block) || undefined;
  const floor = lookup(HOSTEL_SELECTORS.kv.floor) || undefined;
  const bedNo = lookup(HOSTEL_SELECTORS.kv.bedNo) || undefined;
  const allotmentDateRaw = lookup(HOSTEL_SELECTORS.kv.allotmentDate);
  const allotmentDate = allotmentDateRaw ? parseDateDMYorMDY(allotmentDateRaw) : "";
  const feeAmount = parseNum(lookup(HOSTEL_SELECTORS.kv.feeAmount), 0);
  const payMode = lookup(HOSTEL_SELECTORS.kv.payMode);

  const admitCardAvailable =
    detectLinkAvailable($, ["admit card", "admitcard", "hall ticket", "hallticket"]) ||
    /admit\s*card\s*[:\-]?\s*available/i.test($.text());

  const declarationFormAvailable =
    detectLinkAvailable($, ["declaration", "undertaking", "declaration form"]) ||
    /declaration\s*[:\-]?\s*available/i.test($.text());

  const payments = parseAllPayments($, academicYear);
  const allotments = parseAllAllotments($, academicYear);

  let finalHostelName = hostelName;
  let finalRoomNo = roomNo;
  let finalBlock = block;
  let finalFloor = floor;
  let finalBedNo = bedNo;
  let finalAllotmentDate = allotmentDate;

  if (allotments.length > 0) {
    const latest = allotments[allotments.length - 1];
    if (!finalHostelName) finalHostelName = latest.hostelName;
    if (!finalRoomNo) finalRoomNo = latest.roomNo;
    if (!finalBlock && latest.block) finalBlock = latest.block;
    if (!finalFloor && latest.floor) finalFloor = latest.floor;
    if (!finalBedNo && latest.bedNo) finalBedNo = latest.bedNo;
    if (!finalAllotmentDate && latest.allotmentDate) finalAllotmentDate = latest.allotmentDate;
  }

  const hostel: HostelInfo = {
    academicYear,
    hostelName: finalHostelName,
    roomNo: finalRoomNo,
    allotmentDate: finalAllotmentDate,
    feeAmount,
    payMode,
    admitCardAvailable,
    declarationFormAvailable,
  };

  let booking: HostelBooking | undefined;
  if (allotments.length > 0) {
    booking = {
      academicYear,
      status: allotments[allotments.length - 1].status,
      bookingStage: allotments[allotments.length - 1].bookingStage,
      allotment: allotments[allotments.length - 1],
    };
  }

  const result: HostelData = {
    sourceTimestamp: now,
    hostel,
    booking,
    payments,
    allotments,
    admitCardAvailable,
    declarationFormAvailable,
  };

  const parsed = HostelDataSchema.safeParse(result);
  if (parsed.success) {
    return parsed.data;
  }

  const relaxed: HostelData = {
    sourceTimestamp: now,
    hostel: {
      academicYear: result.hostel.academicYear || "",
      hostelName: result.hostel.hostelName || "",
      roomNo: result.hostel.roomNo || "",
      allotmentDate: result.hostel.allotmentDate || "",
      feeAmount: result.hostel.feeAmount || 0,
      payMode: result.hostel.payMode || "",
      admitCardAvailable: result.hostel.admitCardAvailable || false,
      declarationFormAvailable: result.hostel.declarationFormAvailable || false,
    },
    booking: result.booking,
    payments: result.payments,
    allotments: result.allotments,
    admitCardAvailable: result.admitCardAvailable || false,
    declarationFormAvailable: result.declarationFormAvailable || false,
  };
  return relaxed;
}
