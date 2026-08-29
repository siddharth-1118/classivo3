"use client";
import React, { useMemo, useState } from "react";
import { NOVA, mono, cap } from "./tokens";
import { Haptics } from "@/utils/shared/haptics";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const ORDER_COLORS: Record<number, string> = { 1: NOVA.lime, 2: NOVA.blue, 3: NOVA.orange, 4: NOVA.gold, 5: NOVA.purple };

// A pure holiday — the description explicitly says "holiday"
function isHoliday(e: any) {
  return /holiday/i.test(String(e?.description || ""));
}

// A day with no regular classes (order "-") — holiday or special event
function isOffDay(e: any) {
  const order = String(e?.order || e?.dayOrder || "");
  return order === "-" || order === "holiday";
}

// Worth listing in upcoming events: skip plain "Holiday" / "Instructional Day" filler
function isNotable(e: any) {
  const desc = String(e?.description || "").toLowerCase();
  return !/^(holiday|instructional day)$/i.test(desc);
}

function classify(e: any) {
  return isHoliday(e) ? { tag: "holiday", c: NOVA.red } : { tag: "event", c: NOVA.purple };
}

export default function NovaCalendar({ calendarData }: { calendarData: any[] }) {
  const today = new Date();

  const entries = useMemo(() => {
    return (calendarData || []).map((e: any) => {
      const d = new Date(e.date);
      return {
        ...e,
        d,
        dateStr: isNaN(d.getTime()) ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      };
    });
  }, [calendarData]);

  const months = useMemo(() => {
    const map = new Map<string, any[]>();
    entries.forEach((e: any) => {
      if (!e.dateStr) return;
      const key = `${e.d.getFullYear()}-${e.d.getMonth()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries())
      .map(([key, list]) => {
        const [year, month] = key.split("-").map(Number);
        list.sort((a: any, b: any) => a.d.getDate() - b.d.getDate());
        return { key, year, month, list };
      })
      .sort((a, b) => a.year - b.year || a.month - b.month);
  }, [entries]);

  const [activeIdx, setActiveIdx] = useState(() => {
    const nowKey = `${today.getFullYear()}-${today.getMonth()}`;
    const idx = months.findIndex((m) => m.key === nowKey);
    return idx >= 0 ? idx : 0;
  });

  const active = months[activeIdx] || months[0];

  const grid = useMemo(() => {
    if (!active) return [] as any[];
    const first = new Date(active.year, active.month, 1);
    const daysInMonth = new Date(active.year, active.month + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7; // Monday-first
    const cells: any[] = [];
    for (let i = 0; i < offset; i++) cells.push({ pad: true });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${active.year}-${String(active.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const entry = entries.find((e: any) => e.dateStr === dateStr);
      cells.push({ day: d, dateStr, entry });
    }
    return cells;
  }, [active, entries]);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const events = useMemo(() => {
    return (active?.list || []).filter((e: any) => isNotable(e) || /holiday/i.test(String(e.description || "")));
  }, [active]);

  return (
    <div className="min-h-full pb-10" style={{ background: NOVA.bg }}>
      <section className="px-5 pt-7">
        <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ ...mono(), color: NOVA.lime }}>
          academic planner
        </p>
        {active && (
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => { Haptics.selection(); setActiveIdx(Math.max(0, activeIdx - 1)); }}
              disabled={activeIdx === 0}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
              style={{ border: `1px solid ${NOVA.border}`, background: NOVA.panel }}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ color: NOVA.muted }}>chevron_left</span>
            </button>
            <h1 className="flex-1 text-center text-[26px] font-black tracking-tight" style={{ color: NOVA.text }}>
              {MONTHS[active.month]} <span style={{ color: NOVA.lime }}>{active.year}</span>
            </h1>
            <button
              onClick={() => { Haptics.selection(); setActiveIdx(Math.min(months.length - 1, activeIdx + 1)); }}
              disabled={activeIdx === months.length - 1}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
              style={{ border: `1px solid ${NOVA.border}`, background: NOVA.panel }}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ color: NOVA.muted }}>chevron_right</span>
            </button>
          </div>
        )}
      </section>

      {active && (
        <>
          {/* Weekday header */}
          <div className="px-5 mt-5 grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((w) => (
              <span key={w} className="text-center text-[8px] font-black uppercase tracking-widest" style={{ ...mono(), color: NOVA.faint }}>
                {w}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="px-5 mt-1.5 grid grid-cols-7 gap-1.5">
            {grid.map((cell, i) => {
              if (cell.pad) return <div key={`pad-${i}`} />;
              const hol = cell.entry && isHoliday(cell.entry);
              const notable = cell.entry && !hol && isOffDay(cell.entry);
              const isToday = cell.dateStr === todayStr;
              const order = parseInt(String(cell.entry?.order ?? cell.entry?.dayOrder ?? "0"), 10);
              const orderC = ORDER_COLORS[order] || NOVA.faint;
              const fill = hol ? NOVA.lime : notable ? `${NOVA.purple}2e` : isToday ? NOVA.panel2 : NOVA.panel;
              const bd = hol ? NOVA.lime : notable ? `${NOVA.purple}66` : isToday ? NOVA.borderStrong : NOVA.border;
              return (
                <div
                  key={cell.dateStr}
                  className="rounded-lg py-2 flex flex-col items-center gap-0.5"
                  style={{ background: fill, border: `1px solid ${bd}` }}
                >
                  <span className="text-[11px] font-black" style={{ ...mono(), color: hol ? NOVA.ink : NOVA.text }}>
                    {cell.day}
                  </span>
                  <span
                    className="text-[7px] font-black uppercase"
                    style={{ ...mono(), color: hol ? NOVA.ink : notable ? NOVA.purple : orderC }}
                  >
                    {hol ? "hol" : notable ? "evt" : order >= 1 ? `d${order}` : ""}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Upcoming events */}
          <section className="px-5 mt-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ ...mono(), color: NOVA.orange }}>
                upcoming events
              </span>
              <div className="flex-1 h-px" style={{ background: NOVA.border }} />
            </div>
            <div className="space-y-2">
              {events.length === 0 && (
                <p className="text-[12px] font-semibold" style={{ color: NOVA.faint }}>no events this month.</p>
              )}
              {events.map((e: any, i: number) => {
                const { tag, c } = classify(e);
                const desc = String(e.description || e.type || "");
                const [title, ...rest] = desc.split(" - ");
                const sub = rest.join(" - ") || e.day || "";
                return (
                  <div
                    key={i}
                    className="rounded-xl p-3.5 flex items-center gap-3"
                    style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderLeft: `3px solid ${c}` }}
                  >
                    <span
                      className="shrink-0 text-[10px] font-black px-2 py-1 rounded"
                      style={{ ...mono(), color: NOVA.ink, background: NOVA.lime }}
                    >
                      {String(e.d.getDate()).padStart(2, "0")} {MONTHS[e.d.getMonth()].slice(0, 3)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-black tracking-tight truncate" style={{ color: NOVA.text }}>
                        {cap(title)}
                      </p>
                      {sub && (
                        <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5 truncate" style={{ color: NOVA.muted }}>
                          {sub.toLowerCase()}
                        </p>
                      )}
                    </div>
                    <span
                      className="shrink-0 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded"
                      style={{ ...mono(), color: c, background: `${c}14`, border: `1px solid ${c}44` }}
                    >
                      {tag}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
