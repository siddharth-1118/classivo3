"use client";
import React, { useMemo, useState } from "react";
import { NOVA, mono, cap } from "./tokens";
import { Haptics } from "@/utils/shared/haptics";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeToMinutes(t: string): number {
  const m = String(t || "").match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = (m[3] || "").toLowerCase();
  if (mer === "pm" && h !== 12) h += 12;
  else if (mer === "am" && h === 12) h = 0;
  else if (!mer && h < 8) h += 12; // ambiguous 12h-style, assume PM
  return h * 60 + min;
}

function slotsFor(schedule: any, order: number) {
  const daySchedule = schedule?.[`Day ${order}`] || {};
  return Object.entries(daySchedule)
    .map(([time, s]: [string, any]) => ({ time, ...s }))
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

const ORDER_COLORS = [NOVA.lime, NOVA.blue, NOVA.orange, NOVA.gold, NOVA.purple, NOVA.cyan];

// Color-code classes by time of day: morning (before noon) → cyan,
// afternoon → gold, evening → purple.
function periodFor(t: string) {
  const mins = timeToMinutes(t);
  if (mins < 720) return { tag: "morning", c: NOVA.cyan };
  if (mins < 960) return { tag: "afternoon", c: NOVA.gold };
  return { tag: "evening", c: NOVA.purple };
}

export default function NovaTimetable({
  schedule,
  dayOrder,
  calendarData,
}: {
  schedule: any;
  dayOrder?: string;
  calendarData?: any[];
}) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const calMap = useMemo(() => {
    const map = new Map<string, any>();
    (calendarData || []).forEach((e: any) => {
      const d = new Date(e.date);
      if (!isNaN(d.getTime())) map.set(toDateStr(d), e);
    });
    return map;
  }, [calendarData]);

  const fallbackOrder = useMemo(() => parseInt(String(dayOrder || "1"), 10) || 1, [dayOrder]);

  // Every academic day order (1–5), plus any extras the schedule defines,
  // so students can always browse any order's classes.
  const allOrders = useMemo(() => {
    const found = Object.keys(schedule || {})
      .map((k) => parseInt((k.match(/\d+/) || ["0"])[0], 10))
      .filter((n) => !isNaN(n) && n >= 1);
    const max = Math.max(5, ...found);
    const list: number[] = [];
    for (let i = 1; i <= max; i++) list.push(i);
    return list;
  }, [schedule]);

  const isWorkingDay = (ds: string) => {
    const order = parseInt(String(calMap.get(ds)?.order ?? calMap.get(ds)?.dayOrder ?? "0"), 10);
    return !isNaN(order) && order >= 1;
  };

  // Default date: today if it's a working day, otherwise the next working
  // day from the academic calendar (skips holidays/weekends).
  const defaultDate = useMemo(() => {
    const ts = toDateStr(today);
    if (isWorkingDay(ts)) return ts;
    const upcoming = (calendarData || [])
      .map((e: any) => ({
        ds: toDateStr(new Date(e.date)),
        order: parseInt(String(e.order ?? e.dayOrder ?? "0"), 10),
      }))
      .filter((x: any) => x.ds >= ts && !isNaN(x.order) && x.order >= 1)
      .sort((a: any, b: any) => a.ds.localeCompare(b.ds));
    return upcoming.length > 0 ? upcoming[0].ds : null;
  }, [today, calMap, calendarData]);

  // Week strip starts on the week that contains the default date, so on a
  // holiday it lands on the upcoming working week.
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(defaultDate || today);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  });

  // Selected date (calendar mode) — today, or the next working day on holidays
  const [selectedDate, setSelectedDate] = useState<string | null>(defaultDate);

  // Selected day order (all-day-orders mode)
  const [selectedOrder, setSelectedOrder] = useState<number>(() => {
    const ts = toDateStr(today);
    const order = parseInt(String(calMap.get(ts)?.order ?? calMap.get(ts)?.dayOrder ?? "0"), 10);
    if (!isNaN(order) && order >= 1) return order;
    return fallbackOrder;
  });

  const week = useMemo(() => {
    const days: { date: Date; dateStr: string; entry?: any; isToday: boolean; isHoliday: boolean; order: number | null }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const ds = toDateStr(d);
      const entry = calMap.get(ds);
      const raw = parseInt(String(entry?.order ?? entry?.dayOrder ?? "0"), 10);
      const order = !isNaN(raw) && raw >= 1 ? raw : null;
      const isHoliday = !entry || order === null || /holiday/i.test(entry.description || "");
      days.push({ date: d, dateStr: ds, entry, isToday: ds === toDateStr(today), isHoliday, order });
    }
    return days;
  }, [weekStart, calMap, today]);

  // Resolve what to display: holiday state, or slots for the active day order
  const view = useMemo(() => {
    const dateCell = selectedDate ? week.find((w) => w.dateStr === selectedDate) : undefined;
    if (dateCell && dateCell.isHoliday) {
      return { isHoliday: true, holidayDesc: dateCell.entry?.description || "", slots: [] as any[], header: { date: dateCell.date, isToday: dateCell.isToday, label: dateCell.entry?.day || "" } };
    }
    const order = dateCell?.order ?? selectedOrder;
    return {
      isHoliday: false,
      holidayDesc: "",
      slots: slotsFor(schedule, order),
      header: dateCell
        ? { date: dateCell.date, isToday: dateCell.isToday, label: `day ${dateCell.order}` }
        : { date: null, isToday: false, label: `day ${selectedOrder}` },
    };
  }, [selectedDate, selectedOrder, week, schedule]);

  const selectDate = (cell: (typeof week)[number]) => {
    Haptics.selection();
    setSelectedDate(cell.dateStr);
    if (cell.order != null) setSelectedOrder(cell.order);
  };

  const selectOrder = (order: number) => {
    Haptics.selection();
    setSelectedOrder(order);
    setSelectedDate(null);
  };

  const shiftWeek = (dir: number) => {
    Haptics.selection();
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + dir * 7);
    setWeekStart(d);
  };

  const jumpToday = () => {
    Haptics.selection();
    const d = new Date(today);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    setWeekStart(d);
    const ts = toDateStr(today);
    setSelectedDate(ts);
    const order = parseInt(calMap.get(ts)?.order ?? "0", 10);
    if (!isNaN(order) && order >= 1) setSelectedOrder(order);
  };

  return (
    <div className="min-h-full pb-10" style={{ background: NOVA.bg }}>
      <section className="px-5 pt-7">
        <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ ...mono(), color: NOVA.lime }}>
          calendar-driven weekly agenda
        </p>
        <h1 className="text-[30px] font-black tracking-tight mt-1.5" style={{ color: NOVA.text }}>
          Timetable
        </h1>
      </section>

      {/* ── Calendar week strip ── */}
      <section className="px-5 mt-5">
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => shiftWeek(-1)}
            className="flex items-center gap-0.5 pl-1.5 pr-2 h-8 rounded-lg transition-all active:scale-90"
            style={{ border: `1px solid ${NOVA.border}`, background: NOVA.panel }}
          >
            <span className="material-symbols-outlined text-[14px]" style={{ color: NOVA.muted }}>chevron_left</span>
            <span className="text-[8px] font-black uppercase tracking-widest" style={{ ...mono(), color: NOVA.muted }}>prev</span>
          </button>
          <span className="flex-1 text-center text-[12px] font-black uppercase tracking-widest" style={{ ...mono(), color: NOVA.text }}>
            {MONTHS[week[0].date.getMonth()]} {week[0].date.getDate()} – {MONTHS[week[6].date.getMonth()]} {week[6].date.getDate()}
          </span>
          <button
            onClick={() => shiftWeek(1)}
            className="flex items-center gap-0.5 pl-2 pr-1.5 h-8 rounded-lg transition-all active:scale-90"
            style={{ border: `1px solid ${NOVA.border}`, background: NOVA.panel }}
          >
            <span className="text-[8px] font-black uppercase tracking-widest" style={{ ...mono(), color: NOVA.muted }}>next</span>
            <span className="material-symbols-outlined text-[14px]" style={{ color: NOVA.muted }}>chevron_right</span>
          </button>
          <button
            onClick={jumpToday}
            className="h-8 px-3 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all active:scale-90"
            style={{ ...mono(), background: NOVA.lime, color: NOVA.ink, boxShadow: `0 0 14px ${NOVA.lime}22` }}
          >
            today
          </button>
        </div>

        <div className="mt-2.5 grid grid-cols-7 gap-1.5">
          {week.map((w) => {
            const isActive = w.dateStr === selectedDate;
            return (
              <button
                key={w.dateStr}
                onClick={() => selectDate(w)}
                className="rounded-lg py-2 flex flex-col items-center gap-0.5 transition-all active:scale-90"
                style={{
                  background: isActive ? NOVA.lime : w.isToday ? NOVA.panel2 : NOVA.panel,
                  border: `1px solid ${isActive ? NOVA.lime : w.isToday ? NOVA.borderStrong : NOVA.border}`,
                  boxShadow: isActive ? `0 0 14px ${NOVA.lime}33` : "none",
                }}
              >
                <span className="text-[8px] font-black uppercase tracking-widest" style={{ ...mono(), color: isActive ? "#0b0c10" : NOVA.faint }}>
                  {WEEKDAYS[w.date.getDay() === 0 ? 6 : w.date.getDay() - 1]}
                </span>
                <span className="text-[13px] font-black leading-none" style={{ ...mono(), color: isActive ? "#0b0c10" : NOVA.text }}>
                  {w.date.getDate()}
                </span>
                <span
                  className="text-[7px] font-black uppercase tracking-widest"
                  style={{ ...mono(), color: isActive ? "#0b0c10" : w.isHoliday ? NOVA.red : NOVA.faint }}
                >
                  {w.isHoliday ? "hol" : `d${w.order}`}
                </span>
                {w.isToday && !isActive && <span className="w-1 h-1 rounded-full" style={{ background: NOVA.orange }} />}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── All day orders ── */}
      <section className="px-5 mt-7">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ ...mono(), color: NOVA.orange }}>
            02 · all day orders
          </span>
          <div className="flex-1 h-px" style={{ background: NOVA.border }} />
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ ...mono(), color: NOVA.faint }}>
            {allOrders.length} orders
          </span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {allOrders.map((order) => {
            const isActive = selectedDate == null && selectedOrder === order;
            const count = slotsFor(schedule, order).length;
            const oc = ORDER_COLORS[(order - 1) % ORDER_COLORS.length];
            return (
              <button
                key={order}
                onClick={() => selectOrder(order)}
                className="px-4 py-2.5 rounded-lg whitespace-nowrap transition-all active:scale-95 flex items-center gap-2"
                style={{
                  background: isActive ? NOVA.lime : NOVA.panel,
                  border: `1px solid ${isActive ? NOVA.lime : `${oc}44`}`,
                  boxShadow: isActive ? `0 0 14px ${NOVA.lime}33` : "none",
                }}
              >
                <span className="text-[11px] font-black uppercase tracking-widest" style={{ ...mono(), color: isActive ? "#0b0c10" : NOVA.text }}>
                  day {order}
                </span>
                <span className="text-[8px] font-black" style={{ ...mono(), color: isActive ? "#0b0c10" : oc }}>
                  {count} cls
                </span>
              </button>
            );
          })}
          {allOrders.length === 0 && (
            <span className="text-[12px] font-semibold" style={{ color: NOVA.faint }}>no schedule loaded yet.</span>
          )}
        </div>
      </section>

      {/* ── Selected day content ── */}
      <section className="px-5 mt-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ ...mono(), color: NOVA.orange }}>
            {view.header.label}
          </span>
          {view.header.date && (
            <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: NOVA.muted }}>
              {MONTHS[view.header.date.getMonth()]} {view.header.date.getDate()}
            </span>
          )}
          <div className="flex-1 h-px" style={{ background: NOVA.border }} />
          {view.header.isToday && (
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ ...mono(), color: NOVA.orange }}>today</span>
          )}
        </div>

        {view.isHoliday || view.slots.length === 0 ? (
          <div
            className="rounded-xl p-8 flex flex-col items-center gap-2 text-center"
            style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}` }}
          >
            <span className="material-symbols-outlined text-[30px]" style={{ color: view.isHoliday ? NOVA.red : NOVA.faint }}>
              {view.isHoliday ? "beach_access" : "event_busy"}
            </span>
            <p className="text-[14px] font-black tracking-tight" style={{ color: NOVA.text }}>
              {view.isHoliday ? "No classes — off day" : "No classes scheduled"}
            </p>
            {view.holidayDesc && (
              <p className="text-[11px] font-semibold" style={{ color: NOVA.muted }}>{view.holidayDesc}</p>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {view.slots.map((s: any, idx: number) => {
              const period = periodFor(s.time || "");
              const [start, end] = (s.time || "").split(" - ");
              const slotNum = (s.slot || "").replace(/\D/g, "") || String(idx + 1);
              return (
              <div
                key={idx}
                className="rounded-xl p-4 flex items-center gap-4"
                style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderLeft: `3px solid ${period.c}` }}
              >
                <div className="shrink-0 text-center w-[68px] rounded-lg py-2" style={{ background: NOVA.bg, border: `1px solid ${period.c}44` }}>
                  <p className="text-[13px] font-black leading-none" style={{ ...mono(), color: period.c }}>
                    {start || "—"}
                  </p>
                  {end && (
                    <p className="text-[8px] font-black leading-none mt-1" style={{ ...mono(), color: NOVA.faint }}>
                      {end}
                    </p>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[8px] font-black uppercase tracking-widest"
                    style={{ ...mono(), color: period.c }}
                  >
                    {period.tag} - slot {slotNum}
                  </p>
                  <p className="text-[14px] font-black tracking-tight truncate mt-0.5" style={{ color: NOVA.text }}>
                    {cap(String(s.name || s.courseTitle || s.course || s.code || "class"))}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5 truncate" style={{ color: NOVA.muted }}>
                    {s.room || "lab"} · {s.faculty || "—"}
                  </p>
                </div>
                {s.code && (
                  <span className="text-[9px] font-black tracking-widest shrink-0" style={{ ...mono(), color: period.c }}>
                    {s.code}
                  </span>
                )}
              </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
