"use client";
import React, { useMemo, useState } from "react";
import { NOVA, mono, cap } from "./tokens";
import { Haptics } from "@/utils/shared/haptics";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

type FilterType = "all" | "classes" | "holidays" | "exams" | "academic";

interface AgendaEvent {
  type: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  courseCode?: string;
  faculty?: string;
  location?: string;
  description?: string;
  allDay?: boolean;
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeToMinutes(t: string): number {
  const m = String(t || "").match(/(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function isToday(dateStr: string) {
  return dateStr === toDateStr(new Date());
}

function isTomorrow(dateStr: string) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dateStr === toDateStr(tomorrow);
}

function formatRelativeDate(dateStr: string): string {
  if (isToday(dateStr)) return "Today";
  if (isTomorrow(dateStr)) return "Tomorrow";
  const d = new Date(dateStr);
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function classifyEvent(event: AgendaEvent) {
  switch (event.type) {
    case "class":
      return { tag: "class", color: NOVA.cyan, icon: "school" };
    case "holiday":
      return { tag: "holiday", color: NOVA.red, icon: "beach_access" };
    case "working_day":
      return { tag: "event", color: NOVA.purple, icon: "event" };
    case "exam":
      return { tag: "exam", color: NOVA.orange, icon: "quiz" };
    default:
      return { tag: "event", color: NOVA.faint, icon: "event_note" };
  }
}

export default function NovaAgenda({
  calendarData,
  schedule,
  dayOrder,
}: {
  calendarData: any[];
  schedule: any;
  dayOrder?: string;
}) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Build calendar map for quick lookups
  const calMap = useMemo(() => {
    const map = new Map<string, any>();
    (calendarData || []).forEach((e: any) => {
      const d = new Date(e.date);
      if (!isNaN(d.getTime())) map.set(toDateStr(d), e);
    });
    return map;
  }, [calendarData]);

  // Generate today's agenda events
  const todayEvents = useMemo(() => {
    const today = toDateStr(new Date());
    const entry = calMap.get(today);
    const events: AgendaEvent[] = [];

    if (!entry) return events;

    const order = parseInt(String(entry.order ?? entry.dayOrder ?? "0"), 10);
    const isHoliday = /holiday/i.test(String(entry.description || ""));
    const isOffDay = !order || order < 1 || order > 5;

    if (isHoliday || isOffDay) {
      events.push({
        type: "holiday",
        title: entry.description || "Holiday",
        date: today,
        allDay: true,
        description: entry.day || "",
      });
    } else {
      // Get classes for this day order
      const daySchedule = schedule?.[`Day ${order}`] || {};
      const slots = Object.entries(daySchedule)
        .map(([time, s]: [string, any]) => ({
          time,
          ...(s || {}),
        }))
        .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

      slots.forEach((slot) => {
        const [start, end] = (slot.time || "").split(" - ");
        events.push({
          type: "class",
          title: slot.courseTitle || slot.course || slot.name || "Class",
          date: today,
          startTime: start,
          endTime: end,
          courseCode: slot.code || slot.courseCode || "",
          faculty: slot.faculty || "",
          location: slot.room || "",
          description: `Day ${order}`,
        });
      });
    }

    return events;
  }, [calMap, schedule]);

  // Generate upcoming events (next 7 days)
  const upcomingEvents = useMemo(() => {
    const events: AgendaEvent[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const ds = toDateStr(d);
      const entry = calMap.get(ds);

      if (!entry) continue;

      const order = parseInt(String(entry.order ?? entry.dayOrder ?? "0"), 10);
      const isHoliday = /holiday/i.test(String(entry.description || ""));
      const isOffDay = !order || order < 1 || order > 5;

      if (isHoliday || isOffDay) {
        events.push({
          type: "holiday",
          title: entry.description || "Holiday",
          date: ds,
          allDay: true,
          description: entry.day || "",
        });
      } else {
        // Get classes for this day order
        const daySchedule = schedule?.[`Day ${order}`] || {};
        const slots = Object.entries(daySchedule)
          .map(([time, s]: [string, any]) => ({
            time,
            ...(s || {}),
          }))
          .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

        slots.forEach((slot) => {
          const [start, end] = (slot.time || "").split(" - ");
          events.push({
            type: "class",
            title: slot.courseTitle || slot.course || slot.name || "Class",
            date: ds,
            startTime: start,
            endTime: end,
            courseCode: slot.code || slot.courseCode || "",
            faculty: slot.faculty || "",
            location: slot.room || "",
            description: `Day ${order}`,
          });
        });
      }
    }

    return events;
  }, [calMap, schedule]);

  // All events for the month
  const allEvents = useMemo(() => {
    const events: AgendaEvent[] = [];
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const entry = calMap.get(ds);

      if (!entry) continue;

      const order = parseInt(String(entry.order ?? entry.dayOrder ?? "0"), 10);
      const isHoliday = /holiday/i.test(String(entry.description || ""));
      const isOffDay = !order || order < 1 || order > 5;

      if (isHoliday || isOffDay) {
        events.push({
          type: "holiday",
          title: entry.description || "Holiday",
          date: ds,
          allDay: true,
        });
      } else {
        const daySchedule = schedule?.[`Day ${order}`] || {};
        Object.entries(daySchedule).forEach(([time, s]: [string, any]) => {
          const [start, end] = (time || "").split(" - ");
          events.push({
            type: "class",
            title: s?.courseTitle || s?.course || s?.name || "Class",
            date: ds,
            startTime: start,
            endTime: end,
            courseCode: s?.code || s?.courseCode || "",
          });
        });
      }
    }

    return events;
  }, [calMap, schedule]);

  // Filter events
  const filteredUpcoming = useMemo(() => {
    if (filter === "all") return upcomingEvents;
    if (filter === "classes") return upcomingEvents.filter((e) => e.type === "class");
    if (filter === "holidays") return upcomingEvents.filter((e) => e.type === "holiday");
    if (filter === "exams") return upcomingEvents.filter((e) => e.type === "exam");
    return upcomingEvents;
  }, [upcomingEvents, filter]);

  const filteredAll = useMemo(() => {
    if (filter === "all") return allEvents;
    if (filter === "classes") return allEvents.filter((e) => e.type === "class");
    if (filter === "holidays") return allEvents.filter((e) => e.type === "holiday");
    if (filter === "exams") return allEvents.filter((e) => e.type === "exam");
    return allEvents;
  }, [allEvents, filter]);

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, AgendaEvent[]>();
    filteredAll.forEach((e) => {
      if (!groups.has(e.date)) groups.set(e.date, []);
      groups.get(e.date)!.push(e);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredAll]);

  const filters: { key: FilterType; label: string; color: string }[] = [
    { key: "all", label: "all", color: NOVA.text },
    { key: "classes", label: "classes", color: NOVA.cyan },
    { key: "holidays", label: "holidays", color: NOVA.red },
    { key: "exams", label: "exams", color: NOVA.orange },
  ];

  return (
    <div className="min-h-full pb-10" style={{ background: NOVA.bg }}>
      {/* Header */}
      <section className="px-5 pt-7">
        <p
          className="text-[10px] font-black uppercase tracking-[0.22em]"
          style={{ ...mono(), color: NOVA.lime }}
        >
          academic agenda
        </p>
        <h1
          className="text-[30px] font-black tracking-tight mt-1.5"
          style={{ color: NOVA.text }}
        >
          Agenda
        </h1>
      </section>

      {/* Filter chips */}
      <section className="px-5 mt-5">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {filters.map((f) => {
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => {
                  Haptics.selection();
                  setFilter(f.key);
                }}
                className="px-4 py-2 rounded-lg whitespace-nowrap transition-all active:scale-95"
                style={{
                  background: isActive ? NOVA.lime : NOVA.panel,
                  border: `1px solid ${isActive ? NOVA.lime : NOVA.border}`,
                  boxShadow: isActive ? `0 0 14px ${NOVA.lime}33` : "none",
                }}
              >
                <span
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ ...mono(), color: isActive ? NOVA.ink : f.color }}
                >
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Today's Schedule */}
      <section className="px-5 mt-6">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="text-[10px] font-black uppercase tracking-[0.2em]"
            style={{ ...mono(), color: NOVA.orange }}
          >
            today&apos;s schedule
          </span>
          <div className="flex-1 h-px" style={{ background: NOVA.border }} />
        </div>

        {todayEvents.length === 0 ? (
          <div
            className="rounded-xl p-6 flex flex-col items-center gap-2 text-center"
            style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}` }}
          >
            <span
              className="material-symbols-outlined text-[28px]"
              style={{ color: NOVA.faint }}
            >
              event_busy
            </span>
            <p
              className="text-[13px] font-black tracking-tight"
              style={{ color: NOVA.text }}
            >
              No classes today
            </p>
            <p
              className="text-[11px] font-semibold"
              style={{ color: NOVA.muted }}
            >
              Enjoy your day off!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayEvents.map((event, idx) => {
              const { tag, color, icon } = classifyEvent(event);
              return (
                <div
                  key={idx}
                  className="rounded-xl p-4 flex items-center gap-4"
                  style={{
                    background: NOVA.panel,
                    border: `1px solid ${NOVA.border}`,
                    borderLeft: `3px solid ${color}`,
                  }}
                >
                  {event.startTime && (
                    <div
                      className="shrink-0 text-center w-[68px] rounded-lg py-2"
                      style={{ background: NOVA.bg, border: `1px solid ${color}44` }}
                    >
                      <p
                        className="text-[13px] font-black leading-none"
                        style={{ ...mono(), color }}
                      >
                        {event.startTime}
                      </p>
                      {event.endTime && (
                        <p
                          className="text-[8px] font-black leading-none mt-1"
                          style={{ ...mono(), color: NOVA.faint }}
                        >
                          {event.endTime}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[14px] font-black tracking-tight truncate"
                      style={{ color: NOVA.text }}
                    >
                      {cap(event.title)}
                    </p>
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider mt-0.5 truncate"
                      style={{ color: NOVA.muted }}
                    >
                      {event.courseCode && `${event.courseCode} · `}
                      {event.location && `${event.location} · `}
                      {event.faculty || ""}
                    </p>
                  </div>
                  <span
                    className="shrink-0 material-symbols-outlined text-[18px]"
                    style={{ color }}
                  >
                    {icon}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Upcoming Events */}
      <section className="px-5 mt-6">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="text-[10px] font-black uppercase tracking-[0.2em]"
            style={{ ...mono(), color: NOVA.purple }}
          >
            upcoming
          </span>
          <div className="flex-1 h-px" style={{ background: NOVA.border }} />
          <span
            className="text-[9px] font-black uppercase tracking-widest"
            style={{ ...mono(), color: NOVA.faint }}
          >
            {filteredUpcoming.length} events
          </span>
        </div>

        {filteredUpcoming.length === 0 ? (
          <p
            className="text-[12px] font-semibold"
            style={{ color: NOVA.faint }}
          >
            No upcoming events.
          </p>
        ) : (
          <div className="space-y-2">
            {filteredUpcoming.slice(0, 10).map((event, idx) => {
              const { tag, color, icon } = classifyEvent(event);
              return (
                <div
                  key={idx}
                  className="rounded-xl p-3.5 flex items-center gap-3"
                  style={{
                    background: NOVA.panel,
                    border: `1px solid ${NOVA.border}`,
                    borderLeft: `3px solid ${color}`,
                  }}
                >
                  <span
                    className="shrink-0 text-[10px] font-black px-2 py-1 rounded"
                    style={{ ...mono(), color: NOVA.ink, background: color }}
                  >
                    {formatRelativeDate(event.date)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[13px] font-black tracking-tight truncate"
                      style={{ color: NOVA.text }}
                    >
                      {cap(event.title)}
                    </p>
                    {event.startTime && (
                      <p
                        className="text-[10px] font-bold uppercase tracking-wider mt-0.5"
                        style={{ color: NOVA.muted }}
                      >
                        {event.startTime} – {event.endTime}
                      </p>
                    )}
                  </div>
                  <span
                    className="shrink-0 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded"
                    style={{ ...mono(), color, background: `${color}14`, border: `1px solid ${color}44` }}
                  >
                    {tag}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Monthly Calendar View */}
      <section className="px-5 mt-6">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="text-[10px] font-black uppercase tracking-[0.2em]"
            style={{ ...mono(), color: NOVA.blue }}
          >
            {MONTHS[new Date().getMonth()]} calendar
          </span>
          <div className="flex-1 h-px" style={{ background: NOVA.border }} />
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((w) => (
            <span
              key={w}
              className="text-center text-[8px] font-black uppercase tracking-widest"
              style={{ ...mono(), color: NOVA.faint }}
            >
              {w}
            </span>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {(() => {
            const now = new Date();
            const first = new Date(now.getFullYear(), now.getMonth(), 1);
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const offset = (first.getDay() + 6) % 7; // Monday-first
            const cells: any[] = [];

            for (let i = 0; i < offset; i++) cells.push({ pad: true });
            for (let d = 1; d <= daysInMonth; d++) {
              const ds = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const entry = calMap.get(ds);
              const isHol = entry && /holiday/i.test(String(entry.description || ""));
              const order = parseInt(String(entry?.order ?? entry?.dayOrder ?? "0"), 10);
              const isTod = ds === toDateStr(now);
              cells.push({ day: d, ds, entry, isHol, order, isTod });
            }
            return cells;
          })().map((cell, i) => {
            if (cell.pad) return <div key={`pad-${i}`} />;
            const fill = cell.isHol ? NOVA.lime : cell.isTod ? NOVA.panel2 : NOVA.panel;
            const bd = cell.isHol ? NOVA.lime : cell.isTod ? NOVA.borderStrong : NOVA.border;
            const orderC = NOVA.faint;
            return (
              <div
                key={cell.ds}
                className="rounded-lg py-2 flex flex-col items-center gap-0.5"
                style={{ background: fill, border: `1px solid ${bd}` }}
              >
                <span
                  className="text-[11px] font-black"
                  style={{ ...mono(), color: cell.isHol ? NOVA.ink : NOVA.text }}
                >
                  {cell.day}
                </span>
                <span
                  className="text-[7px] font-black uppercase"
                  style={{ ...mono(), color: cell.isHol ? NOVA.ink : cell.order >= 1 ? NOVA.cyan : orderC }}
                >
                  {cell.isHol ? "hol" : cell.order >= 1 ? `d${cell.order}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stats */}
      <section className="px-5 mt-6">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "today", value: todayEvents.filter((e) => e.type === "class").length, color: NOVA.cyan },
            { label: "this week", value: upcomingEvents.filter((e) => e.type === "class").length, color: NOVA.blue },
            { label: "holidays", value: upcomingEvents.filter((e) => e.type === "holiday").length, color: NOVA.red },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-3 text-center"
              style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}` }}
            >
              <p className="text-[22px] font-black" style={{ color: stat.color }}>
                {stat.value}
              </p>
              <p
                className="text-[8px] font-black uppercase tracking-widest mt-1"
                style={{ ...mono(), color: NOVA.faint }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
