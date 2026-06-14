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
    let border = "border border-transparent";
    let dateColor = "text-[#dfe1f4]";
    let orderColor = "text-on-surface-variant";
    let borderDot: React.ReactNode = null;
    let scaleClass = "scale-100 hover:scale-105";

    const isMuted = item.isPast && !item.isSelected && !item.isToday;

    if (item.isSelected) {
      bg = item.isDayExam
        ? "bg-alert-rose"
        : item.isDayHoliday
          ? "bg-[#22C55E]"
          : "bg-primary-container text-background";
      dateColor = item.isDayExam || item.isDayHoliday ? "text-white font-black" : "text-background font-black";
      orderColor = item.isDayExam || item.isDayHoliday ? "text-white/70" : "text-background/80";
      scaleClass = "scale-105 z-10 shadow-md";
    } else if (item.isDayExam) {
      bg = "bg-alert-rose/10";
      border = "border-alert-rose/20";
      dateColor = "text-alert-rose font-black";
      orderColor = "text-alert-rose/60";
      borderDot = <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-alert-rose shadow-[0_0_6px_#F43F5E]" />;
    } else if (item.isToday) {
      border = "border-primary-container border-[2px]";
      dateColor = "text-primary-container font-black";
      orderColor = "text-primary-container/70";
    } else if (item.isDayHoliday) {
      bg = "bg-emerald-500/5";
      border = "border-emerald-500/10";
      dateColor = "text-emerald-400 font-bold";
      orderColor = "text-emerald-400/60";
    } else {
      if (item.dayOrder) {
        bg = "glass-panel";
        border = "border-outline-variant/10";
      }
    }

    return (
      <motion.button
        variants={itemVariants}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          Haptics.selection();
          item.dateObj && onClick(item.dateObj);
        }}
        className={`aspect-square w-full rounded-xl flex flex-col p-2 items-start justify-between relative transition-all duration-200 ${bg} ${border} ${
          isMuted ? "opacity-30" : "opacity-100"
        } ${scaleClass}`}
        style={{ minHeight: "56px" }}
      >
        {borderDot}
        <span className={`font-title-md text-[14px] font-bold ${dateColor}`}>
          {item.day}
        </span>
        {item.dayOrder ? (
          <div className="w-full text-left mt-auto">
            <div className={`h-0.5 w-full rounded-full ${item.isSelected ? 'bg-background' : 'bg-primary-container'}`} />
            <span className={`text-[6.5px] font-label-caps uppercase tracking-wider block mt-1 ${orderColor}`}>
              order {item.dayOrder}
            </span>
          </div>
        ) : item.isDayHoliday && !item.isSelected ? (
          <span className="text-[6.5px] font-label-caps uppercase tracking-wider text-emerald-400 font-bold block mt-auto">holiday</span>
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

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 bg-[#0f131f] text-[#dfe1f4] overflow-hidden select-none font-body-lg">
      
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/30 backdrop-blur-lg border-b border-outline-variant/10 flex justify-between items-center px-5 h-16 w-full">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { Haptics.light(); router.push("/"); }}
            className="material-symbols-outlined text-primary-container hover:bg-primary/10 p-2 rounded-full transition-colors active:scale-90 shrink-0"
          >
            arrow_back
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
          <motion.section variants={itemVariants} className="flex items-center justify-between glass-panel p-4 rounded-xl border border-primary-container/10 shadow-md shrink-0">
            <button 
              onClick={() => { Haptics.light(); handlePrevMonth(); }}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-variant transition-all active:scale-90 text-primary-container"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className="text-center">
              <h2 className="font-headline-lg-mobile text-[18px] font-black text-on-surface lowercase leading-none">
                {monthTitle}
              </h2>
              <p className="font-label-caps text-[9px] text-on-surface-variant uppercase tracking-widest mt-1 font-bold">Academic Year 2025-26</p>
            </div>
            <button 
              onClick={() => { Haptics.light(); handleNextMonth(); }}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-variant transition-all active:scale-90 text-primary-container"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </motion.section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Calendar Grid Section */}
            <motion.section variants={itemVariants} className="md:col-span-2 glass-panel p-5 rounded-xl border border-primary-container/10 shadow-md">
              <div className="grid grid-cols-7 mb-4 gap-2">
                {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d, i) => (
                  <div
                    key={i}
                    className={`text-center font-label-caps text-[10px] uppercase tracking-wider font-extrabold ${
                      i >= 5 ? 'text-alert-rose' : 'text-on-surface-variant/70'
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
            </motion.section>

            {/* Selected Date Event details card */}
            <motion.section variants={itemVariants} className="md:col-span-1 glass-panel border border-primary-container/15 rounded-xl p-5 shadow-lg flex flex-col justify-between min-h-[180px]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-950/40 border border-outline-variant/10 text-on-surface-variant/80 font-label-caps">
                  {display.pill}
                </span>
                <div className="mt-4 text-left">
                  <span className="text-[9.5px] font-bold uppercase tracking-widest text-on-surface-variant/60 block mb-1">
                    {display.label}
                  </span>
                  <h3 className="text-[28px] font-black uppercase tracking-tight text-white leading-none">
                    {display.bigText}
                  </h3>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-outline-variant/10 text-left">
                <p className="text-[15px] font-black text-primary-container lowercase leading-tight mb-2">
                  {display.infoMain}
                </p>
                <div className="space-y-1">
                  {display.infoSub.split(" / ").map((sub: string, idx: number) => (
                    <span
                      key={idx}
                      className="text-[12.5px] font-semibold text-on-surface-variant flex items-center gap-1.5 lowercase"
                    >
                      {display.infoSub.includes("/") && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-container shrink-0" />
                      )}
                      {sub.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </motion.section>
          </div>
        </motion.main>
      </div>
    </div>
  );
}
