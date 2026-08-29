"use client";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Haptics } from "@/utils/shared/haptics";
import {
  buildCourseMap,
  processSchedule,
  getDayOverview,
} from "@/utils/dashboard/timetableLogic";
import {
  getInitialActiveDay,
  handleAddClassLogic,
  handleDeleteCustomLogic,
} from "@/utils/timetable/timetableLogic";
import calendarDataJson from "@/data/calendar_data.json";
import CustomClass from "./CustomClass";
import { AcademiaData } from "@/types";

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Download Timetable as Image ────────────────────────────────────────────
function downloadTimetableImage(schedule: any, data: AcademiaData) {
  const DAYS = [1, 2, 3, 4, 5];
  const DAY_LABELS = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];
  
  // Get custom classes from local storage
  let customClasses: any = {};
  try {
    const stored = localStorage.getItem("classivo_custom_classes");
    if (stored) customClasses = JSON.parse(stored);
  } catch {}

  // Collect all unique time slots across all days
  const allSlots = new Set<string>();
  DAYS.forEach((day) => {
    const dayKey = `Day ${day}`;
    const daySchedule = schedule?.[dayKey] ? Object.values(schedule[dayKey]) : [];
    const customList = customClasses?.[day] || [];
    const combined = [...daySchedule, ...customList];

    combined.forEach((s: any) => {
      if (s && s.time) {
        const normTime = s.time.replace(/\s+/g, "").replace(/-/, " - ");
        allSlots.add(normTime);
      }
    });
  });
  // Sort slots by actual time value, not alphabetically
  const parseSlotMinutes = (slot: string) => {
    // Extract the start time from "HH:MM AM - HH:MM PM" or "H:MM - H:MM" formats
    const match = slot.match(/(\d+):(\d+)\s*(am|pm)?/i);
    if (!match) return 0;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const meridiem = (match[3] || "").toLowerCase();
    if (meridiem === "pm" && h !== 12) h += 12;
    else if (meridiem === "am" && h === 12) h = 0;
    else if (!meridiem && h < 8) h += 12; // assume PM for ambiguous times < 8
    return h * 60 + m;
  };
  const slots = Array.from(allSlots).sort((a, b) => parseSlotMinutes(a) - parseSlotMinutes(b));

  const colW = 160;
  const rowH = 70;
  const headerH = 50;
  const labelW = 90;
  const padX = 20;
  const padY = 20;
  const canvasW = padX * 2 + labelW + colW * DAYS.length;
  const canvasH = padY * 2 + headerH + rowH * Math.max(slots.length, 1);

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  ctx.fillStyle = "#0f131f";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Title
  ctx.fillStyle = "#6ee7f7";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("Classivo — Weekly Timetable", padX, padY + 14);
  const studentName = data?.profile?.name || "Student";
  ctx.fillStyle = "rgba(223,225,244,0.5)";
  ctx.font = "11px sans-serif";
  ctx.fillText(studentName, padX, padY + 30);

  const tableTop = padY + headerH;

  // Day headers
  DAYS.forEach((day, i) => {
    const x = padX + labelW + colW * i;
    ctx.fillStyle = "rgba(110,231,247,0.12)";
    ctx.fillRect(x, tableTop, colW - 2, 36);
    ctx.fillStyle = "#6ee7f7";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(DAY_LABELS[i], x + colW / 2 - 1, tableTop + 23);
  });

  // Time label column header
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(padX, tableTop, labelW - 2, 36);
  ctx.fillStyle = "rgba(223,225,244,0.4)";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("TIME", padX + labelW / 2, tableTop + 23);

  // Rows
  slots.forEach((slot, rowIdx) => {
    const y = tableTop + 36 + rowH * rowIdx;

    // Row background alternating
    ctx.fillStyle = rowIdx % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)";
    ctx.fillRect(padX, y, canvasW - padX * 2, rowH - 2);

    // Time label
    ctx.fillStyle = "rgba(223,225,244,0.5)";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(slot, padX + labelW / 2, y + rowH / 2 + 3);

    DAYS.forEach((day, i) => {
      const x = padX + labelW + colW * i;
      const dayKey = `Day ${day}`;
      const daySchedule = schedule?.[dayKey] ? Object.values(schedule[dayKey]) : [];
      const customList = customClasses?.[day] || [];
      const combined = [...daySchedule, ...customList];

      const entry = combined.find((s: any) => {
        if (!s || !s.time) return false;
        const normTime = s.time.replace(/\s+/g, "").replace(/-/, " - ");
        return normTime === slot;
      });

      if (entry && entry.type !== "break") {
        const isLab = entry.type === "lab" || entry.type === "practical" ||
                      String(entry.course || entry.courseCode || "").toLowerCase().includes("l") ||
                      String(entry.name || "").toLowerCase().includes("lab");
        ctx.fillStyle = isLab ? "rgba(99,102,241,0.2)" : "rgba(110,231,247,0.1)";
        ctx.beginPath();
        ctx.roundRect(x + 4, y + 4, colW - 10, rowH - 10, 8);
        ctx.fill();

        ctx.fillStyle = isLab ? "#818cf8" : "#6ee7f7";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        
        const code = entry.courseCode || entry.course || entry.code || "";
        const name = entry.courseTitle || entry.name || entry.title || code;
        const displayName = String(name).slice(0, 18);
        ctx.fillText(displayName, x + colW / 2 - 1, y + rowH / 2 - 2);

        ctx.fillStyle = "rgba(223,225,244,0.35)";
        ctx.font = "9px sans-serif";
        ctx.fillText(entry.room || "—", x + colW / 2 - 1, y + rowH / 2 + 12);
      }
    });
  });

  if (slots.length === 0) {
    ctx.fillStyle = "rgba(223,225,244,0.3)";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No timetable data available", canvasW / 2, canvasH / 2);
  }

  // Footer
  ctx.fillStyle = "rgba(223,225,244,0.2)";
  ctx.font = "9px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Downloaded from classivo.app • SRMIST", canvasW / 2, canvasH - 8);

  // Download
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `classivo-timetable-${studentName.replace(/\s+/g, "-").toLowerCase()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
// ────────────────────────────────────────────────────────────────────────────

const BEZIER = [0.34, 0.15, 0.16, 0.96] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: -20, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: BEZIER },
  },
};

export default function Timetable({
  data,
  academia,
  setIsSwipeDisabled,
  startEntrance,
}: {
  data: AcademiaData;
  academia: any;
  setIsSwipeDisabled?: (disabled: boolean) => void;
  startEntrance: boolean;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const initialSet = useRef(false);
  const schedule = useMemo(() => 
    academia?.effectiveSchedule || data?.timetable || data?.schedule || {}, 
    [academia, data]
  );

  const todayStr = useMemo(() => {
    const now = new Date();
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const d = String(now.getDate()).padStart(2, "0");
    const m = months[now.getMonth()];
    const y = now.getFullYear();
    return `${d} ${m} ${y}`;
  }, []);

  const calData = academia?.calendarData || calendarDataJson || [];

  const todayEntry = useMemo(() => {
    return calData.find((ev: any) => ev.date === todayStr);
  }, [calData, todayStr]);

  const dayOrderStr =
    todayEntry?.dayOrder || todayEntry?.order || data?.dayOrder || "0";
  const dayOrder = parseInt(String(dayOrderStr)) || 0;

  const isHoliday = useMemo(() => {
    // 1. Check if today is a weekend
    const today = new Date();
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return true;
    }

    // 2. Check if todayEntry explicitly indicates a holiday or no schedule
    if (todayEntry) {
      const orderLower = String(todayEntry.dayOrder || todayEntry.order || "").toLowerCase();
      const descLower = String(todayEntry.description || "").toLowerCase();
      const typeLower = String(todayEntry.type || "").toLowerCase();

      if (
        orderLower.includes("holiday") ||
        orderLower.includes("sunday") ||
        orderLower.includes("saturday") ||
        orderLower.includes("-") ||
        descLower.includes("holiday") ||
        typeLower.includes("holiday") ||
        todayEntry.isDayHoliday === true
      ) {
        return true;
      }
      return false;
    }

    // 3. Fallback: if we have dayOrder from profile and it's 1-5, it's a working day
    if (data?.dayOrder && data.dayOrder !== "-" && data.dayOrder !== "0") {
      const parsed = parseInt(String(data.dayOrder));
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
        return false;
      }
    }

    // Default to false for weekdays without explicit holiday markings
    return false;
  }, [todayEntry, data]);

  const [activeDay, setActiveDay] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const ds = toDateStr(d);
    const ev = calData.find((e: any) => e.date === ds);
    const raw = parseInt(String(ev?.dayOrder ?? ev?.order ?? "0"), 10);
    return !isNaN(raw) && raw >= 1 && raw <= 5 ? ds : null;
  });
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  });
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [timeTick, setTimeTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (setIsSwipeDisabled) {
      setIsSwipeDisabled(isAddingClass);
    }
  }, [isAddingClass, setIsSwipeDisabled]);

  const [newSub, setNewSub] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:50");
  const [newType, setNewType] = useState<"theory" | "lab">("theory");

  const [customClasses, setCustomClasses] = useState<Record<number, any[]>>({});

  const nextWorkingDayOrder = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const futureDays = calData
      .filter((ev: any) => {
        const evDate = new Date(ev.date);
        evDate.setHours(0, 0, 0, 0);
        return evDate > now;
      })
      .sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

    for (const ev of futureDays) {
      const dOrder = parseInt(ev.dayOrder || ev.day_order || ev.order);
      if (!isNaN(dOrder) && dOrder >= 1 && dOrder <= 5) {
        return dOrder;
      }
    }
    return 1;
  }, [calData]);

  const week = useMemo(() => {
    const map = new Map<string, any>();
    calData.forEach((ev: any) => {
      const d = new Date(ev.date);
      if (!isNaN(d.getTime())) map.set(toDateStr(d), ev);
    });
    const days: { date: Date; dateStr: string; entry?: any; order: number | null; isHoliday: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const ds = toDateStr(d);
      const entry = map.get(ds);
      const raw = parseInt(String(entry?.dayOrder ?? entry?.order ?? "0"), 10);
      const order = !isNaN(raw) && raw >= 1 && raw <= 5 ? raw : null;
      const isHoliday = !entry || order === null || /holiday/i.test(String(entry.description || ""));
      days.push({ date: d, dateStr: ds, entry, order, isHoliday, isToday: ds === toDateStr(new Date()) });
    }
    return days;
  }, [calData, weekStart]);

  const weekLabel = useMemo(
    () =>
      `${week[0].date.toLocaleDateString("en-US", { month: "short" })} ${week[0].date.getDate()} – ${week[6].date.toLocaleDateString("en-US", { month: "short" })} ${week[6].date.getDate()}`,
    [week]
  );

  const selectDate = (cell: (typeof week)[number]) => {
    Haptics.selection();
    if (cell.order == null) return; // holiday/weekend — keep current selection
    setSelectedDate(cell.dateStr);
    setActiveDay(cell.order);
    setExpandedCard(null);
  };

  const shiftWeek = (dir: number) => {
    Haptics.selection();
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + dir * 7);
    setWeekStart(d);
    setSelectedDate(null);
  };

  const jumpToday = () => {
    Haptics.selection();
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    setWeekStart(d);
    setSelectedDate(null);
    const order = parseInt(String(dayOrder), 10);
    if (!isNaN(order) && order >= 1) setActiveDay(order);
  };

  useEffect(() => {
    setMounted(true);

    if (
      !initialSet.current &&
      (Object.keys(schedule).length > 0 || isHoliday)
    ) {
      setActiveDay(
        getInitialActiveDay(schedule, isHoliday, dayOrder, nextWorkingDayOrder),
      );
      initialSet.current = true;
    }

    const updateCustomClasses = () => {
      const stored = localStorage.getItem("classivo_custom_classes");
      if (stored) {
        try {
          setCustomClasses(JSON.parse(stored));
        } catch {}
      }
    };
    updateCustomClasses();
    window.addEventListener("custom_classes_updated", updateCustomClasses);
    return () =>
      window.removeEventListener("custom_classes_updated", updateCustomClasses);
  }, [dayOrder, schedule, isHoliday, nextWorkingDayOrder]);

  const courseMap = useMemo(() => buildCourseMap(data), [data]);

  const handleAddClass = () => {
    const success = handleAddClassLogic(
      newSub,
      newRoom,
      startTime,
      endTime,
      newType,
      activeDay,
    );
    if (success) {
      setNewSub("");
      setNewRoom("");
      setStartTime("08:00");
      setEndTime("08:50");
      setIsAddingClass(false);
      setRefreshKey((prev) => prev + 1);
    }
  };

  const handleDeleteCustom = (day: number, timeStr: string) => {
    const success = handleDeleteCustomLogic(day, timeStr);
    if (success) {
      setRefreshKey((prev) => prev + 1);
    }
  };

  const currentSchedule = useMemo(() => {
    return processSchedule(
      schedule,
      customClasses,
      activeDay,
      dayOrder,
      courseMap,
    );
  }, [schedule, customClasses, activeDay, dayOrder, courseMap]);

  const isViewingToday = String(activeDay) === String(dayOrder) && !isHoliday;

  const currentDateStr = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = { weekday: "long", month: "short", day: "numeric" };
    return new Date().toLocaleDateString("en-US", options);
  }, []);

  const nowMins = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, [timeTick]);

  if (!mounted) return null;
  const overview = getDayOverview(currentSchedule);

  return (
    <div className="absolute inset-0 bg-[#0f131f] text-[#dfe1f4] overflow-hidden select-none font-body-lg">
      
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface/30 backdrop-blur-lg border-b border-outline-variant/10 flex justify-between items-center px-5 h-16">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { Haptics.light(); router.push("/"); }}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-primary/10 transition-colors active:scale-95 duration-200 shrink-0"
          >
            <span className="material-symbols-outlined text-primary-container">arrow_back</span>
          </button>
          <h1 className="font-headline-lg-mobile text-[22px] font-black text-primary-container lowercase tracking-tight">
            timetable
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Download Timetable */}
          <button
            onClick={() => {
              Haptics.selection();
              downloadTimetableImage(schedule, data);
            }}
            className="w-10 h-10 rounded-xl bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 flex items-center justify-center active:scale-90 transition-all border border-emerald-400/10"
            title="Download Timetable"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
          </button>
          <button
            onClick={() => { Haptics.selection(); setIsAddingClass(true); }}
            className="w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary-container flex items-center justify-center active:scale-90 transition-all border border-primary-container/10"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
      </header>

      {/* Fixed Calendar Week + All Day Orders Selector */}
      <nav className="fixed top-16 left-0 right-0 z-40 bg-surface-container-low/40 backdrop-blur-xl border-b border-outline-variant/10 py-3 overflow-x-auto no-scrollbar">
        <div className="px-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="font-label-caps text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
              calendar week
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => shiftWeek(-1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 active:scale-90 transition-all border border-outline-variant/10 text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[15px]">chevron_left</span>
              </button>
              <button
                onClick={jumpToday}
                className="font-label-caps text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded border border-outline-variant/10 text-on-surface-variant hover:text-primary-container transition-colors"
              >
                ↻ today
              </button>
              <span className="font-label-caps text-[9px] font-bold text-on-surface-variant whitespace-nowrap">{weekLabel}</span>
              <button
                onClick={() => shiftWeek(1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 active:scale-90 transition-all border border-outline-variant/10 text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[15px]">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Calendar week strip — real dates with day orders from the academic calendar */}
          <div className="grid grid-cols-7 gap-1.5 mb-3">
            {week.map((w) => {
              const isActive = w.dateStr === selectedDate;
              return (
                <button
                  key={w.dateStr}
                  onClick={() => selectDate(w)}
                  className="rounded-xl py-1.5 flex flex-col items-center gap-0.5 transition-all active:scale-90 border"
                  style={{
                    background: isActive ? "rgba(110,231,247,0.12)" : w.isToday ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                    borderColor: isActive ? "rgba(110,231,247,0.4)" : w.isToday ? "rgba(110,231,247,0.25)" : "rgba(255,255,255,0.06)",
                  }}
                >
                  <span className={`font-label-caps text-[8px] font-bold uppercase tracking-wider ${isActive ? "text-primary-container" : "text-on-surface-variant/60"}`}>
                    {w.date.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase()}
                  </span>
                  <span className={`text-[13px] font-black leading-none ${isActive ? "text-primary-container" : "text-on-surface"}`}>
                    {w.date.getDate()}
                  </span>
                  <span className={`font-label-caps text-[7px] font-black uppercase tracking-wider ${w.isHoliday ? "text-red-400" : isActive ? "text-primary-container" : "text-on-surface-variant/50"}`}>
                    {w.isHoliday ? "hol" : `d${w.order}`}
                  </span>
                  {w.isToday && !isActive && <span className="w-1 h-1 rounded-full bg-primary-container" />}
                </button>
              );
            })}
          </div>

          {/* All day orders — tap any to preview its classes */}
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((day) => {
              const isToday = String(day) === String(dayOrder) && !isHoliday;
              const isSelected = activeDay === day;
              const count = Object.keys(schedule?.[`Day ${day}`] || {}).length;
              return (
                <button
                  key={day}
                  onClick={() => {
                    Haptics.selection();
                    setActiveDay(day);
                    setSelectedDate(null);
                    setExpandedCard(null);
                  }}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-label-caps uppercase transition-all duration-300 border flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-primary-container/10 border-primary-container/20 text-primary-container shadow-[0_0_15px_rgba(110,231,247,0.15)] font-bold"
                      : "text-on-surface-variant hover:text-primary border-transparent"
                  }`}
                >
                  Day {day}
                  <span className={`text-[9px] font-black ${isSelected ? "text-primary-container/70" : "text-on-surface-variant/50"}`}>
                    {count} cls
                  </span>
                  {isToday && <span className="text-primary-container">•</span>}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Scroll container */}
      <div className="absolute inset-0 overflow-y-auto no-scrollbar">
        <motion.main 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mt-[250px] pb-32 px-5 max-w-2xl mx-auto space-y-6"
        >
          {/* Current Time Indicator Bar */}
          <div className="flex items-center gap-4 py-2 opacity-60">
            <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-outline-variant to-transparent"></div>
            <span className="font-label-caps text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
              {currentDateStr} • Day Order {activeDay}
            </span>
            <div className="h-[1px] flex-grow bg-gradient-to-r from-outline-variant via-outline-variant to-transparent"></div>
          </div>

          {/* Holiday or overview banner */}
          {isHoliday && (
            <div className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-400">beach_access</span>
              <div>
                <h4 className="font-title-md text-[14px] text-emerald-400 font-bold uppercase tracking-wider">Holiday Today</h4>
                <p className="font-body-sm text-[12px] text-on-surface-variant">Showing upcoming working day orders.</p>
              </div>
            </div>
          )}

          {/* Class Timeline */}
          <div className="space-y-6 relative">
            {/* Timeline Vertical Axis Line */}
            {currentSchedule.length > 0 && (
              <div className="absolute left-[19px] top-4 bottom-4 w-[1.5px] bg-outline-variant/20 z-0"></div>
            )}

            {currentSchedule.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="material-symbols-outlined text-[36px] text-on-surface-variant mb-3">event_busy</span>
                <h3 className="font-title-md text-[16px] text-on-surface font-black">No Classes Scheduled</h3>
                <p className="font-body-sm text-[12.5px] text-on-surface-variant mt-1">Day Order {activeDay} has no classes mapped.</p>
              </div>
            ) : (
              currentSchedule.map((item) => {
                if (item.type === "break") {
                  const isLunch = item.title?.toLowerCase().includes("lunch");
                  return (
                    <div key={item.id} className="relative z-10 flex gap-4 pl-14 py-2">
                      <div className="flex items-center gap-3 text-on-surface-variant/40">
                        <span className="material-symbols-outlined text-[18px]">{isLunch ? 'restaurant' : 'local_cafe'}</span>
                        <span className="font-label-caps text-[9px] font-bold tracking-widest uppercase">
                          {item.title} • {item.time}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Determine slot state: Completed, Active, or Upcoming
                let status: "completed" | "active" | "upcoming" = "upcoming";
                if (isViewingToday) {
                  if (item.minutesEnd && nowMins >= item.minutesEnd) {
                    status = "completed";
                  } else if (item.minutesStart && item.minutesEnd && nowMins >= item.minutesStart && nowMins < item.minutesEnd) {
                    status = "active";
                  }
                }

                const isLab = item.type === "lab" || item.type === "practical";
                const isExpanded = expandedCard === item.id;

                // Configure timeline circle styling based on status
                let circleClass = "bg-surface-container-low border-outline-variant/20 text-on-surface-variant";
                let iconName = isLab ? "biotech" : "schedule";
                
                if (status === "completed") {
                  circleClass = "bg-surface-container-high border-outline-variant/20 text-on-surface-variant/60";
                  iconName = "check_circle";
                } else if (status === "active") {
                  circleClass = "bg-primary-container border-primary-container text-on-primary shadow-[0_0_10px_#6ee7f7]";
                  iconName = "bolt";
                }

                // Class active progress calculation
                let progressPercent = 0;
                if (status === "active" && item.minutesStart && item.minutesEnd) {
                  const total = item.minutesEnd - item.minutesStart;
                  if (total > 0) {
                    progressPercent = Math.min(100, Math.max(0, ((nowMins - item.minutesStart) / total) * 100));
                  }
                }

                const attRecord = data?.attendance?.find((a: any) => a.code === item.courseCode || a.code === item.code);

                return (
                  <div 
                    key={item.id} 
                    className={`relative z-10 flex gap-4 transition-opacity duration-300 ${
                      status === "completed" ? "opacity-50" : "opacity-100"
                    }`}
                  >
                    {/* Circle timeline dot */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center ${circleClass} ${status === 'active' ? 'animate-pulse' : ''}`}>
                      <span 
                        className="material-symbols-outlined text-sm"
                        style={{
                          fontVariationSettings: status === 'completed' || status === 'active' ? "'FILL' 1" : "'FILL' 0"
                        }}
                      >
                        {iconName}
                      </span>
                    </div>

                    <div 
                      onClick={() => { Haptics.selection(); setExpandedCard(isExpanded ? null : item.id); }}
                      className={`flex-grow glass-panel rounded-2xl p-5 space-y-3 border cursor-pointer hover:border-primary-container/20 transition-all duration-300 ${
                        status === 'active' ? 'border-primary-container/40 active-glow shadow-[0_0_15px_rgba(110,231,247,0.1)]' : 'border-outline-variant/10'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-label-caps text-[10px] font-bold uppercase ${status === 'active' ? 'text-primary-container' : 'text-on-surface-variant'}`}>
                              Slot {item.slot} • {item.time}
                            </span>
                            {status === "active" && (
                              <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container text-[9px] font-extrabold tracking-widest uppercase">Now</span>
                            )}
                            {isLab && (
                              <span className="px-2 py-0.5 rounded bg-indigo-950/40 text-indigo-400 border border-indigo-900/30 text-[8px] font-black tracking-wider uppercase">LAB</span>
                            )}
                          </div>
                          <h3 className="font-title-md text-[16px] text-on-surface font-black tracking-tight leading-snug truncate pr-2" style={{ maxWidth: "200px" }}>
                            {item.name || item.course}
                          </h3>
                        </div>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase shrink-0 border ${
                          status === 'active' 
                            ? 'bg-primary-container/20 text-primary-container border-primary-container/10'
                            : 'bg-secondary-container/10 text-on-secondary-container border-transparent'
                        }`}>
                          {item.room || "UB"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center gap-1.5 text-on-surface-variant">
                          <span className="material-symbols-outlined text-[16px]">person</span>
                          <span className="font-body-sm text-[12px] truncate capitalize" style={{ maxWidth: "160px" }}>
                            {item.faculty?.toLowerCase()}
                          </span>
                        </div>

                        {status === "active" && (
                          <div className="w-1/3 h-1 bg-surface-container-high rounded-full overflow-hidden shrink-0">
                            <div className="h-full bg-primary-container shadow-[0_0_8px_#6ee7f7]" style={{ width: `${progressPercent}%` }} />
                          </div>
                        )}
                      </div>

                      {/* Expandable details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden mt-4 pt-4 border-t border-outline-variant/10 space-y-4 text-xs font-semibold"
                          >
                            <div className="grid grid-cols-2 gap-3 bg-black/20 p-3 rounded-xl border border-white/5 text-[11px]">
                              <div>
                                <span className="text-[8px] text-on-surface-variant block uppercase tracking-wider font-bold mb-0.5">Location</span>
                                <span className="text-on-surface">{item.room || "Lab Class"}</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-on-surface-variant block uppercase tracking-wider font-bold mb-0.5">Mentors</span>
                                <span className="text-on-surface capitalize truncate block">{item.faculty?.toLowerCase()}</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-on-surface-variant block uppercase tracking-wider font-bold mb-0.5">Slot Code</span>
                                <span className="text-on-surface">{item.slot || "—"}</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-on-surface-variant block uppercase tracking-wider font-bold mb-0.5">Course Code</span>
                                <span className="text-on-surface uppercase">{item.code || item.courseCode || "—"}</span>
                              </div>
                            </div>

                            {attRecord && (
                              <div className="flex justify-between items-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <div>
                                  <span className="text-[8px] text-on-surface-variant block uppercase tracking-wider font-bold">Attendance Status</span>
                                  <span className="text-on-surface mt-0.5 block">{attRecord.present} present / {attRecord.conducted} classes</span>
                                </div>
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${attRecord.percent >= 75 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {attRecord.percent}%
                                </span>
                              </div>
                            )}

                            {item.isCustom && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  Haptics.warning();
                                  handleDeleteCustom(activeDay, item.time);
                                }}
                                className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-all font-bold uppercase tracking-wider active:scale-95 flex items-center justify-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span> Delete class
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  </div>
                );
              })
            )}
          </div>

        </motion.main>
      </div>

      <CustomClass
        isOpen={isAddingClass}
        onClose={() => setIsAddingClass(false)}
        newSub={newSub}
        setNewSub={setNewSub}
        newRoom={newRoom}
        setNewRoom={setNewRoom}
        startTime={startTime}
        setStartTime={setStartTime}
        endTime={endTime}
        setEndTime={setEndTime}
        newType={newType}
        setNewType={setNewType}
        handleAddClass={handleAddClass}
      />
    </div>
  );
}
