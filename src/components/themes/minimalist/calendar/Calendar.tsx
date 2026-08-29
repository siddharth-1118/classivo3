"use client";
import React, { useState, useEffect, memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCalendarData } from "@/hooks/useCalendarData";
import { Haptics } from "@/utils/shared/haptics";
import calendarDataJson from "@/data/calendar_data.json";

const BEZIER = [0.34, 0.15, 0.16, 0.96] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: BEZIER },
  },
};

const CalendarDay = memo(
  ({
    item,
    onClick,
  }: {
    item: any;
    onClick: (date: Date) => void;
  }) => {
    let bg = "bg-transparent";
    let border = "border border-white/[0.04]";
    let dateColor = "text-[#dfe1f4]";
    let orderColor = "text-slate-400";
    let borderDot: React.ReactNode = null;
    let scaleClass = "scale-100 hover:bg-white/[0.03]";

    const isMuted = item.isPast && !item.isSelected && !item.isToday;

    if (item.isSelected) {
      if (item.isDayExam) {
        bg = "bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/25";
        border = "border border-rose-400/35";
        dateColor = "text-white font-black";
        orderColor = "text-white/80";
      } else if (item.isDayHoliday) {
        bg = "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25";
        border = "border border-emerald-400/35";
        dateColor = "text-white font-black";
        orderColor = "text-white/80";
      } else if (item.isToday) {
        bg = "bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-lg shadow-cyan-500/25";
        border = "border border-cyan-300/35";
        dateColor = "text-white font-black";
        orderColor = "text-white/80";
      } else {
        bg = "bg-white text-slate-950 shadow-lg shadow-white/10";
        border = "border border-white/20";
        dateColor = "text-slate-950 font-black";
        orderColor = "text-slate-800 font-semibold";
      }
      scaleClass = "scale-105 z-10";
    } else if (item.isDayExam) {
      bg = "bg-rose-500/5";
      border = "border border-rose-500/20";
      dateColor = "text-rose-400 font-black";
      orderColor = "text-rose-400/50";
      borderDot = <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />;
    } else if (item.isToday) {
      border = "border-cyan-400 border-2";
      dateColor = "text-cyan-400 font-black";
      orderColor = "text-cyan-400/60";
    } else if (item.isDayHoliday) {
      bg = "bg-emerald-500/5";
      border = "border border-emerald-500/15";
      dateColor = "text-emerald-400 font-bold";
      orderColor = "text-emerald-400/50";
    } else {
      if (item.dayOrder) {
        bg = "bg-white/[0.02]";
        border = "border border-white/[0.06]";
      }
    }

    return (
      <motion.button
        variants={itemVariants}
        whileTap={{ scale: 0.92 }}
        onClick={() => {
          Haptics.selection();
          item.dateObj && onClick(item.dateObj);
        }}
        className={`aspect-square w-full rounded-2xl flex flex-col p-2 items-start justify-between relative transition-all duration-300 ${bg} ${border} ${
          isMuted ? "opacity-35" : "opacity-100"
        } ${scaleClass}`}
        style={{ minHeight: "56px" }}
      >
        {borderDot}
        <span className={`font-title-md text-[14px] font-extrabold ${dateColor}`}>
          {item.day}
        </span>
        {item.dayOrder ? (
          <div className="w-full text-left mt-auto">
            <div className={`h-[1.5px] w-full rounded-full ${item.isSelected ? 'bg-white' : 'bg-cyan-500/40'}`} />
            <span className={`text-[6.5px] font-label-caps uppercase tracking-wider block mt-1.5 font-bold ${orderColor}`}>
              order {item.dayOrder}
            </span>
          </div>
        ) : item.isDayHoliday && !item.isSelected ? (
          <span className="text-[6.5px] font-label-caps uppercase tracking-wider text-emerald-400/80 font-extrabold block mt-auto">holiday</span>
        ) : null}
      </motion.button>
    );
  },
  (prev, next) =>
    prev.item.isSelected === next.item.isSelected &&
    prev.item.isToday === next.item.isToday &&
    prev.item.dayOrder === next.item.dayOrder &&
    prev.item.dateObj?.getTime() === next.item.dateObj?.getTime(),
);
CalendarDay.displayName = "CalendarDay";

export default function Calendar({ data, academia }: any) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const activeData = useMemo(() => 
    academia?.calendarData || data?.calendarData || [], 
    [academia?.calendarData, data?.calendarData]
  );
  const profile = useMemo(() => data?.profile || {}, [data?.profile]);
  const isTargetAudience = useMemo(
    () =>
      (profile.dept || "")
        .toLowerCase()
        .includes("computer science and engineering") &&
      String(profile.semester) === "4",
    [profile],
  );
  
  const {
    display,
    monthTitle,
    handlePrevMonth,
    handleNextMonth,
    goToToday,
    gridData,
    handleDateClick,
  } = useCalendarData(activeData, isTargetAudience);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute month statistics (working vs holidays vs exams)
  const monthStats = useMemo(() => {
    let holidays = 0;
    let workingDays = 0;
    let exams = 0;

    gridData.forEach((day: any) => {
      if (day.type !== "padding") {
        if (day.isDayExam) exams++;
        if (day.isDayHoliday) {
          holidays++;
        } else if (day.dayOrder) {
          workingDays++;
        } else {
          const date = day.dateObj;
          if (date) {
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
              holidays++;
            } else {
              holidays++; // default weekday with no order
            }
          }
        }
      }
    });

    return { holidays, workingDays, exams };
  }, [gridData]);

  // Compute upcoming holidays and exams chronological list
  const monthEventsList = useMemo(() => {
    const list: any[] = [];
    gridData.forEach((day: any) => {
      if (day.type !== "padding") {
        if (day.isDayHoliday || day.isDayExam) {
          const dateStr = day.dateObj?.toDateString();
          const event = activeData.find((e: any) => {
            const dateObj = new Date(e.date);
            return !isNaN(dateObj.getTime()) && dateObj.toDateString() === dateStr;
          });
          list.push({
            day: day.day,
            dateObj: day.dateObj,
            isExam: day.isDayExam,
            isHoliday: day.isDayHoliday,
            title: event?.title || (day.isDayExam ? "exam scheduled" : "holiday"),
            description: event?.description || (day.isDayExam ? "academic semester exams scheduled" : "no instructions scheduled")
          });
        }
      }
    });
    return list.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [gridData, activeData]);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 bg-[#0f131f] text-[#dfe1f4] overflow-hidden select-none font-body-lg">
      
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/30 backdrop-blur-lg border-b border-outline-variant/10 flex justify-between items-center px-5 h-16 w-full">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { Haptics.light(); router.push("/"); }}
            className="p-2 hover:bg-primary/10 rounded-full transition-colors active:scale-90 duration-200 shrink-0"
          >
            <span className="material-symbols-outlined text-primary-container">arrow_back</span>
          </button>
          <h1 className="font-headline-lg-mobile text-[22px] font-black text-primary-container lowercase tracking-tight">
            almanac
          </h1>
        </div>
        <button 
          onClick={() => { Haptics.light(); goToToday(); }}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary-container hover:bg-primary/20 transition-colors active:scale-95 border border-primary-container/10"
        >
          <span className="material-symbols-outlined">target</span>
        </button>
      </header>

      {/* Scrollable Container */}
      <div className="absolute inset-0 overflow-y-auto no-scrollbar">
        <motion.main 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="pt-20 pb-32 px-5 max-w-4xl mx-auto space-y-6"
        >
          {/* Month Selector Card */}
          <motion.section variants={itemVariants} className="flex items-center justify-between bg-[#0f131f]/40 backdrop-blur-xl p-4 rounded-3xl border border-white/5 shadow-xl shrink-0">
            <button 
              onClick={() => { Haptics.light(); handlePrevMonth(); }}
              className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-white/5 text-[#6ee7f7] transition-all active:scale-90"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className="text-center">
              <h2 className="font-headline-lg-mobile text-[18px] font-black text-white lowercase leading-none">
                {monthTitle}
              </h2>
              <p className="font-label-caps text-[9px] text-[#6ee7f7]/70 uppercase tracking-widest mt-1.5 font-bold">Academic Year 2025-26</p>
            </div>
            <button 
              onClick={() => { Haptics.light(); handleNextMonth(); }}
              className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-white/5 text-[#6ee7f7] transition-all active:scale-90"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </motion.section>

          {/* Month Stats Card Row */}
          <motion.section variants={itemVariants} className="grid grid-cols-3 gap-3.5">
            {[
              { label: "working days", val: monthStats.workingDays, color: "text-[#6ee7f7]", bg: "rgba(110,231,247,0.08)", border: "rgba(110,231,247,0.18)" },
              { label: "holidays", val: monthStats.holidays, color: "text-[#22c55e]", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.18)" },
              { label: "exams scheduled", val: monthStats.exams, color: "text-[#f43f5e]", bg: "rgba(244,63,94,0.08)", border: "rgba(244,63,94,0.18)" }
            ].map((stat, i) => (
              <div 
                key={i} 
                className="p-4 rounded-3xl border flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden"
                style={{ background: stat.bg, borderColor: stat.border }}
              >
                <span className={`text-[24px] font-black leading-none ${stat.color}`}>{stat.val}</span>
                <span className="text-[8.5px] font-extrabold uppercase tracking-wider text-slate-400 mt-1.5 leading-tight">{stat.label}</span>
              </div>
            ))}
          </motion.section>

          {/* Core Layout Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Calendar Grid Section */}
            <motion.section variants={itemVariants} className="md:col-span-2 bg-[#0f131f]/40 backdrop-blur-xl p-5 rounded-3xl border border-white/5 shadow-xl">
              <div className="grid grid-cols-7 mb-4 gap-2">
                {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d, i) => (
                  <div
                    key={i}
                    className={`text-center font-label-caps text-[10px] uppercase tracking-wider font-extrabold ${
                      i >= 5 ? 'text-rose-500/80' : 'text-slate-400/80'
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {gridData.map((item: any) =>
                  item.type === "padding" ? (
                    <div key={item.key} className="w-full aspect-square" />
                  ) : (
                    <CalendarDay
                      key={item.key}
                      item={item}
                      onClick={handleDateClick}
                    />
                  ),
                )}
              </div>

              {/* Legends Tag Panel */}
              <div className="flex flex-wrap justify-center gap-4 mt-6 pt-5 border-t border-white/[0.05]">
                {[
                  { label: "Working Day", color: "bg-cyan-500" },
                  { label: "Holiday", color: "bg-emerald-500" },
                  { label: "Exam Day", color: "bg-rose-500" },
                  { label: "Selected", color: "bg-white" }
                ].map((leg, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    <span className={`w-2 h-2 rounded-full ${leg.color}`} />
                    <span>{leg.label}</span>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Selected Date Event details card */}
            <motion.section 
              variants={itemVariants} 
              className="md:col-span-1 border rounded-3xl p-6 shadow-2xl flex flex-col justify-between min-h-[220px] bg-gradient-to-br from-[#0f131f]/60 to-[#0f131f]/20 backdrop-blur-xl relative overflow-hidden"
              style={{
                borderColor: display.pill === "holiday" 
                  ? "rgba(34,197,94,0.22)" 
                  : display.pill === "exam" 
                    ? "rgba(244,63,94,0.22)" 
                    : "rgba(110,231,247,0.22)"
              }}
            >
              <div>
                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border font-label-caps ${
                  display.pill === "holiday"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : display.pill === "exam"
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                }`}>
                  {display.pill}
                </span>
                <div className="mt-5 text-left">
                  <span className="text-[9.5px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                    {display.label}
                  </span>
                  <h3 className="text-[28px] font-black uppercase tracking-tight text-white leading-none">
                    {display.bigText}
                  </h3>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-white/[0.05] text-left">
                <p className="text-[14px] font-black text-white lowercase leading-tight mb-2.5">
                  {display.infoMain}
                </p>
                <div className="space-y-1.5">
                  {display.infoSub.split(" / ").map((sub: string, idx: number) => (
                    <span
                      key={idx}
                      className="text-[12px] font-semibold text-slate-400 flex items-center gap-2 lowercase"
                    >
                      {display.infoSub.includes("/") && (
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          display.pill === "holiday"
                            ? "bg-emerald-500"
                            : display.pill === "exam"
                              ? "bg-rose-500"
                              : "bg-cyan-500"
                        }`} />
                      )}
                      {sub.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </motion.section>
          </div>

          {/* Monthly Highlights Chronological Section */}
          <motion.section variants={itemVariants} className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#6ee7f7] ml-1">Monthly Highlights</h3>
            <div className="grid grid-cols-1 gap-3.5">
              {monthEventsList.length > 0 ? (
                monthEventsList.map((ev: any, idx: number) => (
                  <div 
                    key={idx} 
                    className="p-4 rounded-3xl bg-[#0f131f]/30 border border-white/[0.04] backdrop-blur-md shadow-xl flex items-center gap-4 relative overflow-hidden"
                  >
                    {/* Colored left tag accent */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${ev.isExam ? "bg-rose-500" : "bg-emerald-500"}`} />
                    
                    {/* Date bubble */}
                    <div className={`w-12 h-12 rounded-2xl flex flex-col justify-center items-center text-center shrink-0 border ${
                      ev.isExam 
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    }`}>
                      <span className="text-[15px] font-black leading-none">{ev.day}</span>
                      <span className="text-[7.5px] font-extrabold uppercase mt-0.5">{ev.dateObj?.toLocaleString("default", { month: "short" }).toLowerCase()}</span>
                    </div>

                    {/* Event Description */}
                    <div className="flex-1 min-w-0 text-left pl-1">
                      <h4 className="text-[13px] font-extrabold text-white truncate leading-snug lowercase">{ev.title}</h4>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5 truncate lowercase">{ev.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[11.5px] font-bold text-slate-500 uppercase tracking-widest text-center py-10 bg-white/[0.01] border border-white/[0.04] rounded-3xl">No key academic events scheduled this month</p>
              )}
            </div>
          </motion.section>
        </motion.main>
      </div>
    </div>
  );
}
