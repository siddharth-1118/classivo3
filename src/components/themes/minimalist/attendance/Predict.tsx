"use client";
import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Check, Calendar, Trash2 } from "lucide-react";
import { Haptics } from "@/utils/shared/haptics";

interface PredictProps {
  isOpen: boolean;
  onClose: () => void;
  predictAction: "leave" | "attend" | "od";
  setPredictAction: (action: "leave" | "attend" | "od") => void;
  calYear: number;
  calMonth: number;
  monthName: string;
  setCurrentCalDate: (date: Date) => void;
  startOffset: number;
  daysInMonth: number;
  formatDate: (y: number, m: number, d: number) => string;
  isWeekendStr: (dateStr: string) => boolean;
  holidayMap: Map<string, boolean>;
  isRangeMode: boolean;
  setIsRangeMode: (val: boolean) => void;
  rangeStart: string | null;
  setRangeStart(val: string | null): void;
  setRangeEnd(val: string | null): void;
  selectedDates: Record<string, "leave" | "attend" | "od">;
  setSelectedDates: React.Dispatch<React.SetStateAction<Record<string, "leave" | "attend" | "od">>>;
  handleDateClick: (day: number) => void;
  setIsPredicting: (val: boolean) => void;
}

const DAYS_SHORT = ["M", "T", "W", "T", "F", "S", "S"];

const ACTION_CONFIG = {
  leave: {
    label: "Leave",
    sublabel: "days you'll skip",
    icon: "event_busy",
    color: "#FF6B6B",
    bg: "rgba(255,107,107,0.12)",
    border: "rgba(255,107,107,0.25)",
    glow: "rgba(255,107,107,0.15)",
    activeBg: "linear-gradient(135deg, rgba(255,107,107,0.2) 0%, rgba(255,75,75,0.12) 100%)",
  },
  attend: {
    label: "Attend",
    sublabel: "days you'll be present",
    icon: "event_available",
    color: "#6ee7f7",
    bg: "rgba(110,231,247,0.10)",
    border: "rgba(110,231,247,0.22)",
    glow: "rgba(110,231,247,0.15)",
    activeBg: "linear-gradient(135deg, rgba(110,231,247,0.18) 0%, rgba(99,230,255,0.1) 100%)",
  },
  od: {
    label: "OD / ML",
    sublabel: "official duty days",
    icon: "work_history",
    color: "#FB923C",
    bg: "rgba(251,146,60,0.10)",
    border: "rgba(251,146,60,0.22)",
    glow: "rgba(251,146,60,0.15)",
    activeBg: "linear-gradient(135deg, rgba(251,146,60,0.2) 0%, rgba(234,120,30,0.1) 100%)",
  },
};

export default function Predict({
  isOpen,
  onClose,
  predictAction,
  setPredictAction,
  calYear,
  calMonth,
  monthName,
  setCurrentCalDate,
  startOffset,
  daysInMonth,
  formatDate,
  isWeekendStr,
  holidayMap,
  isRangeMode,
  setIsRangeMode,
  rangeStart,
  setRangeStart,
  setRangeEnd,
  selectedDates,
  setSelectedDates,
  handleDateClick,
  setIsPredicting,
}: PredictProps) {
  const cfg = ACTION_CONFIG[predictAction];
  const selectedCount = Object.keys(selectedDates).length;

  const countByType = useMemo(() => {
    const counts = { leave: 0, attend: 0, od: 0 };
    Object.values(selectedDates).forEach((t) => counts[t]++);
    return counts;
  }, [selectedDates]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.5}
            onDragEnd={(_, info) => {
              if (info.offset.y > 130 || info.velocity.y > 500) onClose();
            }}
            className="fixed left-0 right-0 bottom-0 z-[60] rounded-t-[32px] flex flex-col overflow-hidden"
            style={{
              background: "rgba(10,13,23,0.98)",
              backdropFilter: "blur(30px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderBottom: "none",
              maxHeight: "92dvh",
            }}
          >
            {/* Drag pill */}
            <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mt-3 mb-0 shrink-0" />

            {/* Scrollable content */}
            <div className="flex flex-col overflow-y-auto no-scrollbar px-5 pt-5 pb-6 gap-5 max-w-lg mx-auto w-full">

              {/* ── HEADER ── */}
              <div className="flex items-start justify-between shrink-0">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                    >
                      <span
                        className="material-symbols-outlined text-[16px]"
                        style={{ color: cfg.color }}
                      >
                        auto_predict
                      </span>
                    </div>
                    <h2
                      className="text-[22px] font-black text-white leading-none lowercase tracking-tight"
                    >
                      predict
                    </h2>
                  </div>
                  <p className="text-[11px] text-white/35 font-medium ml-10">
                    {cfg.sublabel} · {isRangeMode ? "range select" : "tap to select"}
                  </p>
                </div>
                <button
                  onClick={() => { Haptics.selection(); onClose(); }}
                  className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all active:scale-90 shrink-0"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <X size={16} strokeWidth={2.5} className="text-white/60" />
                </button>
              </div>

              {/* ── ACTION TYPE SELECTOR ── */}
              <div
                className="flex gap-2 p-1.5 rounded-2xl shrink-0"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {(["leave", "attend", "od"] as const).map((action) => {
                  const c = ACTION_CONFIG[action];
                  const isActive = predictAction === action;
                  return (
                    <button
                      key={action}
                      onClick={() => { Haptics.selection(); setPredictAction(action); }}
                      className="flex-1 py-2.5 px-2 rounded-[14px] flex flex-col items-center gap-1 transition-all duration-200 active:scale-95"
                      style={{
                        background: isActive ? c.activeBg : "transparent",
                        border: isActive ? `1px solid ${c.border}` : "1px solid transparent",
                        boxShadow: isActive ? `0 0 20px ${c.glow}` : "none",
                      }}
                    >
                      <span
                        className="material-symbols-outlined text-[18px] transition-all"
                        style={{ color: isActive ? c.color : "rgba(255,255,255,0.25)" }}
                      >
                        {c.icon}
                      </span>
                      <span
                        className="text-[9px] font-black uppercase tracking-wider transition-all"
                        style={{ color: isActive ? c.color : "rgba(255,255,255,0.25)" }}
                      >
                        {c.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* ── MONTH NAVIGATOR ── */}
              <div className="flex items-center justify-between shrink-0">
                <button
                  onClick={() => setCurrentCalDate(new Date(calYear, calMonth - 1, 1))}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
                >
                  <ChevronLeft size={18} className="text-white/60" />
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-[15px] font-black text-white uppercase tracking-[0.12em]">
                    {monthName}
                  </span>
                  <span className="text-[10px] font-bold text-white/30 tracking-wider">{calYear}</span>
                </div>
                <button
                  onClick={() => setCurrentCalDate(new Date(calYear, calMonth + 1, 1))}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
                >
                  <ChevronRight size={18} className="text-white/60" />
                </button>
              </div>

              {/* ── CALENDAR GRID ── */}
              <div
                className="rounded-3xl p-4 shrink-0"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-3">
                  {DAYS_SHORT.map((d, i) => (
                    <div
                      key={i}
                      className="text-center text-[10px] font-black text-white/20 uppercase tracking-widest py-1"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: startOffset }).map((_, i) => (
                    <div key={i} className="aspect-square" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateObj = new Date(calYear, calMonth, day);
                    const dStr = formatDate(calYear, calMonth, day);
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    const isPast = dateObj < now;
                    const isToday = dateObj.getTime() === now.getTime();
                    const isWeekend = isWeekendStr(dStr);
                    const isHoliday = holidayMap.has(dStr);
                    const isDisabled = isWeekend || isHoliday || (isPast && predictAction !== "od");

                    const selectedType = selectedDates[dStr];
                    const isSelected = !!selectedType;
                    const selCfg = isSelected ? ACTION_CONFIG[selectedType] : null;

                    return (
                      <div key={day} className="relative aspect-square">
                        <button
                          onClick={() => { Haptics.selection(); handleDateClick(day); }}
                          disabled={isDisabled}
                          className="w-full h-full rounded-xl flex items-center justify-center text-[13px] font-black transition-all duration-150 active:scale-85"
                          style={{
                            background: isSelected
                              ? selCfg!.bg
                              : isToday
                              ? "rgba(110,231,247,0.08)"
                              : "transparent",
                            border: isSelected
                              ? `1px solid ${selCfg!.border}`
                              : isToday
                              ? "1px solid rgba(110,231,247,0.3)"
                              : "1px solid transparent",
                            color: isDisabled
                              ? "rgba(255,255,255,0.12)"
                              : isSelected
                              ? selCfg!.color
                              : isToday
                              ? "#6ee7f7"
                              : "rgba(255,255,255,0.7)",
                            boxShadow: isSelected ? `0 0 12px ${selCfg!.glow}` : "none",
                          }}
                        >
                          {day}
                        </button>
                        {/* Today indicator dot */}
                        {isToday && !isSelected && (
                          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />
                        )}
                        {/* Holiday dot */}
                        {isHoliday && !isWeekend && !isSelected && (
                          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-400" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.05] justify-center">
                  {[
                    { color: "#6ee7f7", label: "Today" },
                    { color: "#ef4444", label: "Holiday" },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                      <span className="text-[10px] font-medium text-white/30">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── SELECTION MODE TOGGLE ── */}
              <div
                className="flex gap-2 p-1.5 rounded-2xl shrink-0"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {[
                  { label: "Single Day", icon: "event", value: false },
                  { label: "Date Range", icon: "date_range", value: true },
                ].map(({ label, icon, value }) => {
                  const isActive = isRangeMode === value;
                  return (
                    <button
                      key={label}
                      onClick={() => {
                        Haptics.selection();
                        setIsRangeMode(value);
                        if (!value) {
                          setRangeStart(null);
                          setRangeEnd(null);
                          setSelectedDates({});
                        } else {
                          setSelectedDates({});
                        }
                      }}
                      className="flex-1 py-2.5 rounded-[14px] flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
                      style={{
                        background: isActive ? "rgba(110,231,247,0.1)" : "transparent",
                        border: isActive ? "1px solid rgba(110,231,247,0.2)" : "1px solid transparent",
                      }}
                    >
                      <span
                        className="material-symbols-outlined text-[15px]"
                        style={{ color: isActive ? "#6ee7f7" : "rgba(255,255,255,0.3)" }}
                      >
                        {icon}
                      </span>
                      <span
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: isActive ? "#6ee7f7" : "rgba(255,255,255,0.3)" }}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* ── SELECTED SUMMARY + CONFIRM ── */}
              <div
                className="flex items-center justify-between rounded-2xl px-5 py-4 shrink-0"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {/* Type breakdown */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                    selected
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[32px] font-black text-white leading-none">{selectedCount}</span>
                    <span className="text-[11px] font-bold text-white/35">days</span>
                  </div>
                  {selectedCount > 0 && (
                    <div className="flex items-center gap-2 mt-0.5">
                      {(["leave", "attend", "od"] as const).map((t) =>
                        countByType[t] > 0 ? (
                          <span
                            key={t}
                            className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                            style={{
                              background: ACTION_CONFIG[t].bg,
                              color: ACTION_CONFIG[t].color,
                              border: `1px solid ${ACTION_CONFIG[t].border}`,
                            }}
                          >
                            {countByType[t]} {t}
                          </span>
                        ) : null
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Clear button */}
                  {selectedCount > 0 && (
                    <button
                      onClick={() => {
                        Haptics.light();
                        setSelectedDates({});
                        setRangeStart(null);
                        setRangeEnd(null);
                      }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90"
                      style={{
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.18)",
                      }}
                    >
                      <Trash2 size={15} className="text-red-400" />
                    </button>
                  )}

                  {/* Confirm button */}
                  <button
                    onClick={() => {
                      if (selectedCount > 0) {
                        Haptics.success();
                        setIsPredicting(true);
                        onClose();
                      }
                    }}
                    disabled={selectedCount === 0}
                    className="h-10 px-5 rounded-xl flex items-center gap-2 transition-all active:scale-95 font-black text-[12px] uppercase tracking-wider"
                    style={{
                      background:
                        selectedCount > 0
                          ? `linear-gradient(135deg, ${cfg.color} 0%, ${cfg.border} 100%)`
                          : "rgba(255,255,255,0.06)",
                      color: selectedCount > 0 ? "#0a0d17" : "rgba(255,255,255,0.2)",
                      border: selectedCount > 0 ? "none" : "1px solid rgba(255,255,255,0.08)",
                      boxShadow: selectedCount > 0 ? `0 0 20px ${cfg.glow}` : "none",
                    }}
                  >
                    <Check size={15} strokeWidth={3} />
                    Predict
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
