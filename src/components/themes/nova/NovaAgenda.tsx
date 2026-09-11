"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NOVA, mono, cap, carbonGlass, glassCard, statusBadge, SPRINGS } from "./tokens";
import { Haptics } from "@/utils/shared/haptics";
import { TimetableDownloadModal } from "@/components/timetable/TimetableDownloadModal";
import {
  handleAddClassLogic,
  handleEditClassLogic,
  handleDeleteCustomLogic,
} from "@/utils/timetable/timetableLogic";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type MainTab = "timeline" | "orders" | "calendar";
type FilterType = "all" | "classes" | "holidays" | "exams";

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

function parseLocalDate(dateInput: any): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  const str = String(dateInput).trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  
  const parts = str.split(/\s+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1].substring(0, 3).toLowerCase();
    const year = parseInt(parts[2], 10);
    const monthIdx = SHORT_MONTHS.findIndex((m) => m.toLowerCase() === monthStr);
    if (!isNaN(day) && monthIdx !== -1 && !isNaN(year)) {
      return new Date(year, monthIdx, day);
    }
  }
  
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toDateStr(d: Date | null) {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDayOrderNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  const match = String(val).match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function timeToMinutes(t: string): number {
  const m = String(t || "").match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = (m[3] || "").toLowerCase();
  if (mer === "pm" && h !== 12) h += 12;
  else if (mer === "am" && h === 12) h = 0;
  else if (!mer && h < 8) h += 12;
  return h * 60 + min;
}

function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
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
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function classifyEvent(event: AgendaEvent) {
  switch (event.type) {
    case "class":
      return { tag: "CLASS", color: NOVA.cyan, icon: "school" };
    case "holiday":
      return { tag: "HOLIDAY", color: NOVA.red, icon: "beach_access" };
    case "working_day":
      return { tag: "EVENT", color: NOVA.purple, icon: "event" };
    case "exam":
      return { tag: "EXAM", color: NOVA.orange, icon: "quiz" };
    default:
      return { tag: "EVENT", color: NOVA.faint, icon: "event_note" };
  }
}

function periodForTime(t: string) {
  const mins = timeToMinutes(t);
  if (mins < 720) return { label: "Morning", color: NOVA.cyan };
  if (mins < 960) return { label: "Afternoon", color: NOVA.gold };
  return { label: "Evening", color: NOVA.purple };
}

function getBunkStatus(code: string, title: string, subjectAttendance?: any[]) {
  if (!subjectAttendance || subjectAttendance.length === 0) return null;
  const match = subjectAttendance.find((s) => {
    if (code && s.code && s.code.toLowerCase().includes(code.toLowerCase())) return true;
    if (title && s.name && s.name.toLowerCase().includes(title.toLowerCase())) return true;
    return false;
  });
  if (!match) return null;

  const pct = match.percentage ?? 0;
  const conducted = match.conducted ?? 0;
  const present = match.present ?? 0;

  let safeBunks = Math.floor((present - 0.75 * conducted) / 0.75);
  if (safeBunks < 0) safeBunks = 0;

  let neededClasses = 0;
  if (pct < 75) {
    neededClasses = Math.ceil((0.75 * conducted - present) / 0.25);
    if (neededClasses < 0) neededClasses = 0;
  }

  return {
    pct,
    conducted,
    present,
    safeBunks,
    neededClasses,
    isSafe: pct >= 75,
  };
}

export default function NovaAgenda({
  calendarData,
  schedule,
  dayOrder,
  subjectAttendance,
  timeStatus,
}: {
  calendarData: any[];
  schedule: any;
  dayOrder?: string;
  subjectAttendance?: any[];
  timeStatus?: any;
}) {
  const [activeTab, setActiveTab] = useState<MainTab>("timeline");
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<number>(() => parseDayOrderNumber(dayOrder) || 1);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(toDateStr(new Date()));
  const [nowMins, setNowMins] = useState(getCurrentTimeMinutes());

  // Timetable Download & Reschedule Timing Modal States
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Class Timing Edit Form States
  const [editSubject, setEditSubject] = useState("");
  const [editRoom, setEditRoom] = useState("");
  const [editStartTime, setEditStartTime] = useState("08:00 AM");
  const [editEndTime, setEditEndTime] = useState("08:50 AM");
  const [editType, setEditType] = useState<"theory" | "lab">("theory");
  const [oldTimeStr, setOldTimeStr] = useState("");
  const [isCustomSlot, setIsCustomSlot] = useState(false);

  const handleOpenAddModal = () => {
    Haptics.medium();
    setEditSubject("");
    setEditRoom("");
    setEditStartTime("08:00 AM");
    setEditEndTime("08:50 AM");
    setEditType("theory");
    setOldTimeStr("");
    setIsCustomSlot(false);
    setIsEditModalOpen(true);
  };

  const handleOpenEditSlot = (slot: any) => {
    Haptics.medium();
    const times = (slot.time || "08:00 AM - 08:50 AM").split(" - ");
    setEditSubject(slot.courseTitle || slot.name || slot.course || slot.code || "");
    setEditRoom(slot.room || "");
    setEditStartTime(times[0]?.trim() || "08:00 AM");
    setEditEndTime(times[1]?.trim() || "08:50 AM");
    setEditType(slot.type === "lab" || slot?.slot?.startsWith("P") ? "lab" : "theory");
    setOldTimeStr(slot.time || "");
    setIsCustomSlot(!!slot.isCustom);
    setIsEditModalOpen(true);
  };

  const handleSaveTiming = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubject.trim() || !editRoom.trim() || !editStartTime.trim() || !editEndTime.trim()) return;
    Haptics.heavy();

    if (oldTimeStr) {
      handleEditClassLogic(selectedOrder, oldTimeStr, editSubject.trim(), editRoom.trim(), editStartTime.trim(), editEndTime.trim(), editType);
    } else {
      handleAddClassLogic(editSubject.trim(), editRoom.trim(), editStartTime.trim(), editEndTime.trim(), editType, selectedOrder);
    }

    setIsEditModalOpen(false);
  };

  const handleDeleteSlot = () => {
    if (!oldTimeStr) return;
    Haptics.heavy();
    handleDeleteCustomLogic(selectedOrder, oldTimeStr);
    setIsEditModalOpen(false);
  };

  useEffect(() => {
    const timer = setInterval(() => setNowMins(getCurrentTimeMinutes()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Map calendar data by local date string
  const calMap = useMemo(() => {
    const map = new Map<string, any>();
    (calendarData || []).forEach((e: any) => {
      const d = parseLocalDate(e.date);
      if (d) map.set(toDateStr(d), e);
    });
    return map;
  }, [calendarData]);

  // Active day order calculation
  const currentTodayOrder = useMemo(() => {
    const todayStr = toDateStr(new Date());
    const entry = calMap.get(todayStr);
    if (entry) {
      const order = parseDayOrderNumber(entry.order ?? entry.dayOrder);
      if (order >= 1 && order <= 5) return order;
    }
    return parseDayOrderNumber(dayOrder) || 1;
  }, [calMap, dayOrder]);

  // Today's events
  const todayEvents = useMemo(() => {
    const today = toDateStr(new Date());
    const entry = calMap.get(today);
    const events: AgendaEvent[] = [];

    const order = entry ? parseDayOrderNumber(entry.order ?? entry.dayOrder) : currentTodayOrder;
    const isHoliday = entry ? /holiday/i.test(String(entry.description || "")) : false;
    const isOffDay = isHoliday || !order || order < 1 || order > 5;

    if (isOffDay) {
      events.push({
        type: "holiday",
        title: entry?.description || "Holiday / Off Day",
        date: today,
        allDay: true,
        description: entry?.day || "No academic classes scheduled",
      });
    } else {
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
  }, [calMap, schedule, currentTodayOrder]);

  // Find currently ongoing or up next class today
  const activeClassStatus = useMemo(() => {
    if (todayEvents.length === 0) return null;
    const classes = todayEvents.filter((e) => e.type === "class" && e.startTime && e.endTime);
    if (classes.length === 0) return null;

    // Check ongoing class
    const ongoing = classes.find((c) => {
      const startMins = timeToMinutes(c.startTime!);
      const endMins = timeToMinutes(c.endTime!);
      return nowMins >= startMins && nowMins <= endMins;
    });

    if (ongoing) {
      const startMins = timeToMinutes(ongoing.startTime!);
      const endMins = timeToMinutes(ongoing.endTime!);
      const totalDur = Math.max(1, endMins - startMins);
      const elapsed = Math.max(0, nowMins - startMins);
      const pct = Math.min(100, Math.round((elapsed / totalDur) * 100));
      return { type: "ongoing" as const, event: ongoing, progressPct: pct };
    }

    // Check next upcoming class today
    const upcoming = classes.find((c) => timeToMinutes(c.startTime!) > nowMins);
    if (upcoming) {
      const minsLeft = timeToMinutes(upcoming.startTime!) - nowMins;
      return { type: "next" as const, event: upcoming, minsLeft };
    }

    return { type: "done" as const, event: null };
  }, [todayEvents, nowMins]);

  // Generate upcoming events for next 7 days
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

      const order = parseDayOrderNumber(entry.order ?? entry.dayOrder);
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

  // Filtered upcoming events
  const filteredUpcoming = useMemo(() => {
    let result = upcomingEvents;
    if (filter === "classes") result = result.filter((e) => e.type === "class");
    if (filter === "holidays") result = result.filter((e) => e.type === "holiday");
    if (filter === "exams") result = result.filter((e) => e.type === "exam");

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.courseCode && e.courseCode.toLowerCase().includes(q)) ||
          (e.faculty && e.faculty.toLowerCase().includes(q)) ||
          (e.location && e.location.toLowerCase().includes(q))
      );
    }
    return result;
  }, [upcomingEvents, filter, searchQuery]);

  // Day Orders list
  const availableOrders = useMemo(() => {
    const keys = Object.keys(schedule || {});
    const orders = keys
      .map((k) => parseDayOrderNumber(k))
      .filter((n) => !isNaN(n) && n >= 1);
    const max = Math.max(5, ...orders);
    const list: number[] = [];
    for (let i = 1; i <= max; i++) list.push(i);
    return list;
  }, [schedule]);

  // Order schedule slots
  const selectedOrderSlots = useMemo(() => {
    const daySchedule = schedule?.[`Day ${selectedOrder}`] || {};
    return Object.entries(daySchedule)
      .map(([time, s]: [string, any]) => ({
        time,
        ...(s || {}),
      }))
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  }, [schedule, selectedOrder]);

  return (
    <div className="min-h-full pb-16" style={{ background: NOVA.bg }}>
      {/* ── Page Header ── */}
      <section className="px-5 pt-7">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ background: NOVA.lime, boxShadow: `0 0 12px ${NOVA.lime}` }}
              />
              <p className="text-[11px] font-black uppercase tracking-[0.24em]" style={{ ...mono(), color: NOVA.lime }}>
                Day Order {currentTodayOrder} Active
              </p>
            </div>
            <h1 className="text-[32px] font-black tracking-tight mt-1" style={{ color: NOVA.text }}>
              Agenda
            </h1>
          </div>

          {/* Day Order Banner Chip */}
          <div
            className="px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${NOVA.lime} 0%, #8BE000 100%)`,
              boxShadow: `0 0 20px ${NOVA.lime}40`,
            }}
          >
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ ...mono(), color: NOVA.ink }}>
              Order
            </span>
            <span className="text-[18px] font-black leading-none" style={{ ...mono(), color: NOVA.ink }}>
              0{currentTodayOrder}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <span
            className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px]"
            style={{ color: NOVA.muted }}
          >
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search course, code, faculty, or room..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[12px] font-semibold outline-none transition-all"
            style={{
              background: NOVA.panel,
              border: `1px solid ${NOVA.border}`,
              color: NOVA.text,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-bold"
              style={{ color: NOVA.muted }}
            >
              ✕
            </button>
          )}
        </div>
      </section>

      {/* ── Main View Tabs ── */}
      <section className="px-5 mt-5">
        <div
          className="grid grid-cols-3 p-1 rounded-xl"
          style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}` }}
        >
          {[
            { id: "timeline" as const, label: "Timeline", icon: "schedule" },
            { id: "orders" as const, label: "Day Orders", icon: "view_day" },
            { id: "calendar" as const, label: "Calendar", icon: "calendar_month" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  Haptics.selection();
                  setActiveTab(tab.id);
                }}
                className="relative py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: NOVA.lime,
                      boxShadow: `0 0 16px ${NOVA.lime}40`,
                    }}
                    transition={SPRINGS.smooth}
                  />
                )}
                <span
                  className="material-symbols-outlined text-[16px] relative z-10"
                  style={{ color: isActive ? NOVA.ink : NOVA.muted }}
                >
                  {tab.icon}
                </span>
                <span
                  className="text-[10px] font-black uppercase tracking-wider relative z-10"
                  style={{ ...mono(), color: isActive ? NOVA.ink : NOVA.muted }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        {activeTab === "timeline" && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Live Class Hero Card */}
            {activeClassStatus && activeClassStatus.type === "ongoing" && (
              <section className="px-5 mt-5">
                <div
                  className="rounded-2xl p-5 relative overflow-hidden"
                  style={carbonGlass(NOVA.green, "40")}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"
                      style={statusBadge(NOVA.green, true)}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                      Happening Now
                    </span>
                    <span
                      className="text-[10px] font-black uppercase tracking-widest"
                      style={{ ...mono(), color: NOVA.green }}
                    >
                      {activeClassStatus.event!.startTime} – {activeClassStatus.event!.endTime}
                    </span>
                  </div>

                  <h3 className="text-[18px] font-black tracking-tight" style={{ color: NOVA.text }}>
                    {cap(activeClassStatus.event!.title)}
                  </h3>

                  <div className="flex items-center gap-3 mt-2 text-[11px] font-semibold" style={{ color: NOVA.muted }}>
                    {activeClassStatus.event!.location && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]" style={{ color: NOVA.cyan }}>
                          location_on
                        </span>
                        {activeClassStatus.event!.location}
                      </span>
                    )}
                    {activeClassStatus.event!.faculty && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]" style={{ color: NOVA.purple }}>
                          person
                        </span>
                        {activeClassStatus.event!.faculty}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[9px] font-black mb-1" style={{ ...mono(), color: NOVA.faint }}>
                      <span>CLASS PROGRESS</span>
                      <span>{activeClassStatus.progressPct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: NOVA.panel2 }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${activeClassStatus.progressPct}%`,
                          background: NOVA.green,
                          boxShadow: `0 0 10px ${NOVA.green}`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Next Class Hero Card */}
            {activeClassStatus && activeClassStatus.type === "next" && (
              <section className="px-5 mt-5">
                <div
                  className="rounded-2xl p-5 relative overflow-hidden"
                  style={glassCard(NOVA.cyan, "30")}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
                      style={statusBadge(NOVA.cyan, false)}
                    >
                      Up Next In {activeClassStatus.minsLeft} Mins
                    </span>
                    <span
                      className="text-[10px] font-black uppercase tracking-widest"
                      style={{ ...mono(), color: NOVA.cyan }}
                    >
                      {activeClassStatus.event!.startTime}
                    </span>
                  </div>

                  <h3 className="text-[18px] font-black tracking-tight" style={{ color: NOVA.text }}>
                    {cap(activeClassStatus.event!.title)}
                  </h3>

                  <div className="flex items-center gap-3 mt-2 text-[11px] font-semibold" style={{ color: NOVA.muted }}>
                    {activeClassStatus.event!.location && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]" style={{ color: NOVA.cyan }}>
                          location_on
                        </span>
                        {activeClassStatus.event!.location}
                      </span>
                    )}
                    {activeClassStatus.event!.faculty && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]" style={{ color: NOVA.purple }}>
                          person
                        </span>
                        {activeClassStatus.event!.faculty}
                      </span>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Filter chips */}
            <section className="px-5 mt-5">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { key: "all" as const, label: "All Events", color: NOVA.text },
                  { key: "classes" as const, label: "Classes", color: NOVA.cyan },
                  { key: "holidays" as const, label: "Holidays", color: NOVA.red },
                  { key: "exams" as const, label: "Exams", color: NOVA.orange },
                ].map((f) => {
                  const isActive = filter === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => {
                        Haptics.selection();
                        setFilter(f.key);
                      }}
                      className="px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all active:scale-95"
                      style={{
                        background: isActive ? NOVA.lime : NOVA.panel,
                        border: `1px solid ${isActive ? NOVA.lime : NOVA.border}`,
                        boxShadow: isActive ? `0 0 12px ${NOVA.lime}30` : "none",
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
                  Day Order {currentTodayOrder} Schedule
                </span>
                <div className="flex-1 h-px" style={{ background: NOVA.border }} />
                <span
                  className="text-[9px] font-black uppercase tracking-widest"
                  style={{ ...mono(), color: NOVA.faint }}
                >
                  {todayEvents.length} items
                </span>
              </div>

              {todayEvents.length === 0 ? (
                <div
                  className="rounded-2xl p-7 flex flex-col items-center gap-2 text-center"
                  style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}` }}
                >
                  <span className="material-symbols-outlined text-[32px]" style={{ color: NOVA.faint }}>
                    beach_access
                  </span>
                  <p className="text-[14px] font-black tracking-tight" style={{ color: NOVA.text }}>
                    No classes scheduled today
                  </p>
                  <p className="text-[11px] font-semibold" style={{ color: NOVA.muted }}>
                    Take time to rest or catch up on coursework!
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {todayEvents.map((event, idx) => {
                    const { tag, color, icon } = classifyEvent(event);
                    const period = event.startTime ? periodForTime(event.startTime) : null;
                    const bunk = getBunkStatus(event.courseCode || "", event.title, subjectAttendance);

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden transition-all"
                        style={{
                          background: NOVA.panel,
                          border: `1px solid ${NOVA.border}`,
                          borderLeft: `4px solid ${color}`,
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {event.startTime && (
                            <div
                              className="shrink-0 text-center w-[72px] rounded-xl py-2 px-1"
                              style={{ background: NOVA.bg, border: `1px solid ${color}33` }}
                            >
                              <p className="text-[13px] font-black leading-none" style={{ ...mono(), color }}>
                                {event.startTime}
                              </p>
                              {event.endTime && (
                                <p className="text-[9px] font-black leading-none mt-1" style={{ ...mono(), color: NOVA.faint }}>
                                  {event.endTime}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              {period && (
                                <span
                                  className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                                  style={{ ...mono(), color: period.color, background: `${period.color}15` }}
                                >
                                  {period.label}
                                </span>
                              )}
                              {event.courseCode && (
                                <span className="text-[9px] font-black tracking-wider" style={{ ...mono(), color: NOVA.faint }}>
                                  {event.courseCode}
                                </span>
                              )}
                            </div>

                            <p className="text-[15px] font-black tracking-tight truncate" style={{ color: NOVA.text }}>
                              {cap(event.title)}
                            </p>

                            <div className="flex items-center gap-3 mt-1 text-[11px] font-semibold truncate" style={{ color: NOVA.muted }}>
                              {event.location && (
                                <span>Room: {event.location}</span>
                              )}
                              {event.faculty && (
                                <span>• {event.faculty}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bunk Shield Safety Badge */}
                        {bunk && (
                          <div
                            className="pt-2 border-t flex items-center justify-between text-[10px] font-bold"
                            style={{ borderColor: NOVA.border }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[13px]" style={{ color: bunk.isSafe ? NOVA.green : NOVA.red }}>
                                {bunk.isSafe ? "check_circle" : "warning"}
                              </span>
                              <span style={{ color: NOVA.muted }}>Attendance:</span>
                              <span className="font-black" style={{ ...mono(), color: bunk.isSafe ? NOVA.green : NOVA.red }}>
                                {bunk.pct}%
                              </span>
                            </div>

                            <span
                              className="px-2 py-0.5 rounded text-[9px] font-black"
                              style={{
                                ...mono(),
                                background: bunk.isSafe ? `${NOVA.green}18` : `${NOVA.red}18`,
                                color: bunk.isSafe ? NOVA.green : NOVA.red,
                              }}
                            >
                              {bunk.isSafe ? `Safe (+${bunk.safeBunks} bunks)` : `Needs ${bunk.neededClasses} classes`}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Upcoming Events (Next 7 Days) */}
            <section className="px-5 mt-7">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="text-[10px] font-black uppercase tracking-[0.2em]"
                  style={{ ...mono(), color: NOVA.purple }}
                >
                  Upcoming Schedule (7 Days)
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
                <p className="text-[12px] font-semibold" style={{ color: NOVA.faint }}>
                  No upcoming events match your filter.
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredUpcoming.slice(0, 12).map((event, idx) => {
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
                          className="shrink-0 text-[10px] font-black px-2.5 py-1 rounded-md"
                          style={{ ...mono(), color: NOVA.ink, background: color }}
                        >
                          {formatRelativeDate(event.date)}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-black tracking-tight truncate" style={{ color: NOVA.text }}>
                            {cap(event.title)}
                          </p>
                          {event.startTime && (
                            <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: NOVA.muted }}>
                              {event.startTime} – {event.endTime} {event.location ? `· ${event.location}` : ""}
                            </p>
                          )}
                        </div>

                        <span
                          className="shrink-0 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded"
                          style={{ ...mono(), color, background: `${color}14`, border: `1px solid ${color}33` }}
                        >
                          {tag}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </motion.div>
        )}

        {/* ── Day Orders Tab ── */}
        {activeTab === "orders" && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="px-5 mt-5"
          >
            {/* Action Toolbar: Download Timetable & Reschedule Class */}
            <div className="flex items-center justify-between gap-2.5 mb-4">
              <button
                onClick={() => { Haptics.medium(); setIsDownloadModalOpen(true); }}
                className="flex-1 py-3 px-4 rounded-2xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 border border-cyan-400/30"
                style={{ ...mono(), background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)", color: "#fff" }}
              >
                <span className="material-symbols-outlined text-[17px]">download</span>
                Download Timetable
              </button>
              <button
                onClick={handleOpenAddModal}
                className="py-3 px-4 rounded-2xl font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all border active:scale-95 shrink-0"
                style={{ ...mono(), background: `${NOVA.orange}18`, borderColor: `${NOVA.orange}44`, color: NOVA.orange }}
              >
                <span className="material-symbols-outlined text-[17px]">edit_calendar</span>
                Reschedule Class
              </button>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ ...mono(), color: NOVA.orange }}>
                Select Day Order
              </span>
              <div className="flex-1 h-px" style={{ background: NOVA.border }} />
            </div>

            {/* Day Order Chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {availableOrders.map((ord) => {
                const isActive = selectedOrder === ord;
                const slotCount = (schedule?.[`Day ${ord}`] ? Object.keys(schedule[`Day ${ord}`]).length : 0);

                return (
                  <button
                    key={ord}
                    onClick={() => {
                      Haptics.selection();
                      setSelectedOrder(ord);
                    }}
                    className="px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 active:scale-95"
                    style={{
                      background: isActive ? NOVA.lime : NOVA.panel,
                      border: `1px solid ${isActive ? NOVA.lime : NOVA.border}`,
                      boxShadow: isActive ? `0 0 16px ${NOVA.lime}35` : "none",
                    }}
                  >
                    <span className="text-[12px] font-black uppercase tracking-wider" style={{ ...mono(), color: isActive ? NOVA.ink : NOVA.text }}>
                      Day {ord}
                    </span>
                    <span
                      className="text-[9px] font-black px-1.5 py-0.5 rounded"
                      style={{ ...mono(), background: isActive ? NOVA.ink : `${NOVA.cyan}20`, color: isActive ? NOVA.lime : NOVA.cyan }}
                    >
                      {slotCount} cls
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Day Order Slots */}
            <div className="mt-5 space-y-2.5">
              {selectedOrderSlots.length === 0 ? (
                <div
                  className="rounded-2xl p-7 text-center"
                  style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}` }}
                >
                  <p className="text-[13px] font-bold" style={{ color: NOVA.muted }}>
                    No slots registered for Day Order {selectedOrder}
                  </p>
                </div>
              ) : (
                selectedOrderSlots.map((slot: any, idx: number) => {
                  const period = periodForTime(slot.time || "");
                  const bunk = getBunkStatus(slot.code || slot.courseCode || "", slot.courseTitle || slot.name || "", subjectAttendance);

                  return (
                    <div
                      key={idx}
                      className="rounded-2xl p-4 flex flex-col gap-2.5"
                      style={{
                        background: NOVA.panel,
                        border: `1px solid ${NOVA.border}`,
                        borderLeft: `4px solid ${period.color}`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="shrink-0 text-center w-[70px] rounded-xl py-2"
                          style={{ background: NOVA.bg, border: `1px solid ${period.color}33` }}
                        >
                          <p className="text-[12px] font-black leading-none" style={{ ...mono(), color: period.color }}>
                            {slot.time ? slot.time.split(" - ")[0] : "—"}
                          </p>
                          {slot.time && slot.time.includes(" - ") && (
                            <p className="text-[8px] font-black leading-none mt-1" style={{ ...mono(), color: NOVA.faint }}>
                              {slot.time.split(" - ")[1]}
                            </p>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-black uppercase tracking-wider" style={{ ...mono(), color: period.color }}>
                            {period.label} · Slot {(slot.slot || String(idx + 1)).replace(/\D/g, "")}
                          </p>
                          <p className="text-[14px] font-black tracking-tight truncate mt-0.5" style={{ color: NOVA.text }}>
                            {cap(slot.courseTitle || slot.name || slot.course || "Class")}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5 truncate" style={{ color: NOVA.muted }}>
                            {slot.room || "Lab"} · {slot.faculty || "Faculty"}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {(slot.code || slot.courseCode) && (
                            <span className="text-[9px] font-black tracking-widest" style={{ ...mono(), color: period.color }}>
                              {slot.code || slot.courseCode}
                            </span>
                          )}
                          <button
                            onClick={() => handleOpenEditSlot(slot)}
                            className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 border"
                            style={{
                              ...mono(),
                              background: `${NOVA.orange}18`,
                              borderColor: `${NOVA.orange}44`,
                              color: NOVA.orange,
                            }}
                          >
                            <span className="material-symbols-outlined text-[12px]">edit</span>
                            Edit
                          </button>
                        </div>
                      </div>

                      {/* Bunk Shield Indicator */}
                      {bunk && (
                        <div
                          className="pt-2 border-t flex items-center justify-between text-[10px] font-bold"
                          style={{ borderColor: NOVA.border }}
                        >
                          <span style={{ color: NOVA.muted }}>Subject Bunk Safety:</span>
                          <span
                            className="px-2 py-0.5 rounded text-[9px] font-black"
                            style={{
                              ...mono(),
                              background: bunk.isSafe ? `${NOVA.green}18` : `${NOVA.red}18`,
                              color: bunk.isSafe ? NOVA.green : NOVA.red,
                            }}
                          >
                            {bunk.pct}% ({bunk.isSafe ? `+${bunk.safeBunks} bunks` : `${bunk.neededClasses} needed`})
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {/* ── Calendar Tab ── */}
        {activeTab === "calendar" && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="px-5 mt-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ ...mono(), color: NOVA.blue }}>
                {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ ...mono(), color: NOVA.faint }}>
                Tap date for details
              </span>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
              {WEEKDAYS.map((w) => (
                <span key={w} className="text-[8px] font-black uppercase tracking-widest" style={{ ...mono(), color: NOVA.faint }}>
                  {w}
                </span>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {(() => {
                const now = new Date();
                const first = new Date(now.getFullYear(), now.getMonth(), 1);
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                const offset = (first.getDay() + 6) % 7;
                const cells: any[] = [];

                for (let i = 0; i < offset; i++) cells.push({ pad: true });
                for (let d = 1; d <= daysInMonth; d++) {
                  const ds = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  const entry = calMap.get(ds);
                  const isHol = entry && /holiday/i.test(String(entry.description || ""));
                  const order = parseDayOrderNumber(entry?.order ?? entry?.dayOrder);
                  const isTod = ds === toDateStr(now);
                  const isSel = ds === selectedCalendarDate;
                  cells.push({ day: d, ds, entry, isHol, order, isTod, isSel });
                }
                return cells;
              })().map((cell, i) => {
                if (cell.pad) return <div key={`pad-${i}`} />;
                return (
                  <button
                    key={cell.ds}
                    onClick={() => {
                      Haptics.selection();
                      setSelectedCalendarDate(cell.ds);
                    }}
                    className="rounded-xl py-2 flex flex-col items-center gap-0.5 transition-all active:scale-90"
                    style={{
                      background: cell.isSel ? NOVA.lime : cell.isHol ? `${NOVA.red}20` : cell.isTod ? NOVA.panel2 : NOVA.panel,
                      border: `1px solid ${cell.isSel ? NOVA.lime : cell.isHol ? `${NOVA.red}44` : cell.isTod ? NOVA.borderStrong : NOVA.border}`,
                      boxShadow: cell.isSel ? `0 0 12px ${NOVA.lime}40` : "none",
                    }}
                  >
                    <span
                      className="text-[11px] font-black"
                      style={{ ...mono(), color: cell.isSel ? NOVA.ink : cell.isHol ? NOVA.red : NOVA.text }}
                    >
                      {cell.day}
                    </span>
                    <span
                      className="text-[7px] font-black uppercase"
                      style={{
                        ...mono(),
                        color: cell.isSel ? NOVA.ink : cell.isHol ? NOVA.red : cell.order >= 1 ? NOVA.cyan : NOVA.faint,
                      }}
                    >
                      {cell.isHol ? "HOL" : cell.order >= 1 ? `D${cell.order}` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Date Details */}
            {selectedCalendarDate && (
              <div className="mt-5">
                {(() => {
                  const entry = calMap.get(selectedCalendarDate);
                  const order = parseDayOrderNumber(entry?.order ?? entry?.dayOrder);
                  const isHol = entry && /holiday/i.test(String(entry.description || ""));

                  return (
                    <div
                      className="rounded-2xl p-5"
                      style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] font-black tracking-tight" style={{ color: NOVA.text }}>
                          {formatRelativeDate(selectedCalendarDate)} ({selectedCalendarDate})
                        </span>
                        <span
                          className="px-2.5 py-0.5 rounded text-[9px] font-black uppercase"
                          style={{
                            ...mono(),
                            background: isHol ? `${NOVA.red}20` : order >= 1 ? `${NOVA.cyan}20` : `${NOVA.faint}20`,
                            color: isHol ? NOVA.red : order >= 1 ? NOVA.cyan : NOVA.faint,
                          }}
                        >
                          {isHol ? "Holiday" : order >= 1 ? `Day Order ${order}` : "Off Day"}
                        </span>
                      </div>

                      {entry?.description && (
                        <p className="text-[12px] font-semibold mt-1" style={{ color: NOVA.muted }}>
                          {entry.description}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Timetable Download Modal ── */}
      <TimetableDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        schedule={schedule}
      />

      {/* ── Reschedule Class Timing Modal ── */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-3xl p-6 relative overflow-hidden border border-white/10 shadow-2xl"
              style={{ background: "#0e1117" }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${NOVA.orange}20`, border: `1px solid ${NOVA.orange}44` }}
                  >
                    <span className="material-symbols-outlined text-[20px]" style={{ color: NOVA.orange }}>
                      edit_calendar
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[16px] font-black text-white tracking-tight">
                      {oldTimeStr ? "Reschedule Class Timing" : "Add Custom Class"}
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400" style={mono()}>
                      Day Order 0{selectedOrder}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveTiming} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400" style={mono()}>
                    Course / Subject Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    placeholder="e.g. Advanced Operating Systems"
                    className="w-full px-3.5 py-2.5 rounded-xl text-[13px] font-semibold bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400" style={mono()}>
                    Classroom / Lab Venue
                  </label>
                  <input
                    type="text"
                    required
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                    placeholder="e.g. Tech Park 602 or Lab 3"
                    className="w-full px-3.5 py-2.5 rounded-xl text-[13px] font-semibold bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400" style={mono()}>
                      Start Time
                    </label>
                    <input
                      type="text"
                      required
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      placeholder="08:00 AM"
                      className="w-full px-3.5 py-2.5 rounded-xl text-[12px] font-mono bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400" style={mono()}>
                      End Time
                    </label>
                    <input
                      type="text"
                      required
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      placeholder="08:50 AM"
                      className="w-full px-3.5 py-2.5 rounded-xl text-[12px] font-mono bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400" style={mono()}>
                    Slot Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditType("theory")}
                      className={`py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border ${
                        editType === "theory"
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                          : "bg-white/5 border-white/10 text-slate-400"
                      }`}
                      style={mono()}
                    >
                      Theory Class
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditType("lab")}
                      className={`py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border ${
                        editType === "lab"
                          ? "bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                          : "bg-white/5 border-white/10 text-slate-400"
                      }`}
                      style={mono()}
                    >
                      Practical / Lab
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  {isCustomSlot && oldTimeStr && (
                    <button
                      type="button"
                      onClick={handleDeleteSlot}
                      className="px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-all"
                      style={mono()}
                    >
                      Delete Slot
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-[11px] font-bold text-slate-400 hover:text-white bg-white/5 border border-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider text-black transition-all shadow-lg active:scale-95"
                    style={{ ...mono(), background: "linear-gradient(135deg, #a3e635 0%, #8be000 100%)" }}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

