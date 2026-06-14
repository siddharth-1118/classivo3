"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Calculator, 
  X, 
  ChevronRight as ChevronRightIcon, 
  Loader, 
  Calendar, 
  TrendingUp,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  getBaseAttendance,
  getImpactMap,
  getProcessedList,
  getStatus,
  getAcronym,
  getRecoveryDate,
  getOverallStats
} from "@/utils/attendance/attendanceLogic";
import calendarDataJson from "@/data/calendar_data.json";
import Predict from "./Predict";
import { AcademiaData } from "@/types";
import { useAppLayout } from "@/context/AppLayoutContext";
import { getRandomRoast } from "@/utils/shared/flavortext";
import { useApp } from "@/context/AppContext";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Haptics } from "@/utils/shared/haptics";

const BEZIER = [0.34, 1.56, 0.64, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: BEZIER },
  },
};

const getSubjectTheme = (percent: number, safe: boolean) => {
  if (percent >= 85) {
    return {
      borderClass: "border-l-primary-container",
      textClass: "text-primary-container",
      bgBadge: "bg-primary-container/10",
      statusLabel: "excellent",
      barColor: "#6ee7f7"
    };
  } else if (percent >= 75) {
    return {
      borderClass: "border-l-tertiary-container",
      textClass: "text-tertiary-container",
      bgBadge: "bg-tertiary-container/10",
      statusLabel: "warning",
      barColor: "#ffd061"
    };
  } else {
    return {
      borderClass: "border-l-alert-rose",
      textClass: "text-alert-rose",
      bgBadge: "bg-alert-rose/10",
      statusLabel: "critical",
      barColor: "#F43F5E"
    };
  }
};

function SubjectCard({ 
  sub, 
  isPredicting, 
  isExpanded, 
  onToggle 
}: { 
  sub: any; 
  isPredicting: boolean; 
  isExpanded: boolean; 
  onToggle: () => void; 
}) {
  const percentVal = parseFloat(sub.percent);
  const theme = getSubjectTheme(percentVal, sub.safe);

  const formattedDate = sub.recoveryDate ? new Date(sub.recoveryDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short"
  }) : null;

  return (
    <motion.div
      layout="position"
      whileTap={{ scale: 0.98 }}
      className={`glass-panel rounded-xl p-5 border-l-4 transition-all duration-300 relative overflow-hidden cursor-pointer ${theme.borderClass} ${
        isExpanded ? "border-glow-primary" : ""
      }`}
      onClick={onToggle}
    >
      <div className="flex justify-between items-start mb-3 relative z-10">
        <div>
          <span className={`font-label-caps text-[10px] py-1 px-2 rounded font-bold uppercase ${theme.bgBadge} ${theme.textClass}`}>
            {sub.displayCode}
          </span>
          <h3 className="font-title-md text-[16px] text-on-surface mt-2 capitalize font-black tracking-tight leading-snug">
            {sub.fullName}
          </h3>
          <p className="font-body-sm text-[12px] text-on-surface-variant font-medium mt-0.5">
            conducted: {sub.conducted} classes
          </p>
        </div>
        
        <div className="text-right">
          <div className={`font-headline-lg text-[24px] font-black ${theme.textClass}`}>
            {sub.percent}%
          </div>
          <div className="font-label-caps text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">
            {theme.statusLabel}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10 relative z-10">
        <div className="flex gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">check_circle</span>
            <span className="text-on-surface">{sub.present}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-alert-rose">cancel</span>
            <span className="text-on-surface">{sub.conducted - sub.present}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isPredicting && sub.hasChanged && (
            <div className="flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-white/5" style={{ color: theme.barColor }}>
              <span className="opacity-50">{sub.originalVal}</span>
              <ChevronRightIcon size={8} />
              <span>{sub.val}</span>
            </div>
          )}
          <div className="h-1.5 w-24 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full" style={{ width: `${Math.min(percentVal, 100)}%`, backgroundColor: theme.barColor }} />
          </div>
        </div>
      </div>

      {/* Expanded drawer details */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mt-3 pt-3 border-t border-outline-variant/10 text-[12px] font-medium leading-relaxed space-y-2 text-on-surface-variant"
          >
            {sub.safe ? (
              <div className="flex items-start gap-2 bg-primary-container/5 border border-primary-container/10 rounded-xl p-3">
                <span className="material-symbols-outlined text-primary-container text-sm mt-0.5">verified</span>
                <div>
                  <span className="text-on-surface font-bold">Safe Zone: </span>
                  You can miss the next <b className="text-primary-container font-black">{sub.val}</b> classes in a row for this course and your attendance will stay above 75%.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-2 bg-alert-rose/5 border border-alert-rose/10 rounded-xl p-3">
                  <span className="material-symbols-outlined text-alert-rose text-sm mt-0.5">warning</span>
                  <div>
                    <span className="text-on-surface font-bold">Action Required: </span>
                    You must attend the next <b className="text-alert-rose font-black">{sub.val}</b> classes consecutively to bring your attendance back to 75%.
                  </div>
                </div>
                {formattedDate && (
                  <div className="flex items-start gap-2 bg-surface-container-high/50 border border-outline-variant/10 rounded-xl p-3">
                    <span className="material-symbols-outlined text-primary-container text-sm mt-0.5">calendar_month</span>
                    <div>
                      <span className="text-on-surface font-bold">Recovery Target: </span>
                      Estimated recovery to 75% is expected by <span className="text-primary-container font-black">{formattedDate}</span>.
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Attendance({
  data,
  academia,
}: {
  data: AcademiaData;
  academia: any;
}) {
  const router = useRouter();
  const { profileSeed } = useApp();
  const { setIsSwipeDisabled } = useAppLayout();
  const [isPredictOverlay, setIsPredictOverlay] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Quick bunk count forecast slider state
  const [extraBunks, setExtraBunks] = useState(0);

  const {
    pullY,
    isRefreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = usePullToRefresh(isPredictOverlay);

  useEffect(() => {
    if (setIsSwipeDisabled) {
      setIsSwipeDisabled(isPredictOverlay);
    }
  }, [isPredictOverlay, setIsSwipeDisabled]);

  const [predictAction, setPredictAction] = useState<"leave" | "attend" | "od">(
    "leave",
  );
  const [activeTab, setActiveTab] = useState<"all" | "action" | "safe">("all");
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Record<string, "leave" | "attend" | "od">>({});
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [currentCalDate, setCurrentCalDate] = useState(new Date());

  const calYear = currentCalDate.getFullYear();
  const calMonth = currentCalDate.getMonth();
  const monthName = useMemo(() => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return monthNames[calMonth];
  }, [calMonth]);

  const startOffset = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    return (firstDay.getDay() + 6) % 7;
  }, [calYear, calMonth]);

  const daysInMonth = useMemo(() => {
    return new Date(calYear, calMonth + 1, 0).getDate();
  }, [calYear, calMonth]);

  const formatDate = useCallback((y: number, m: number, d: number) => {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }, []);

  const isWeekendStr = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    return day === 0 || day === 6;
  }, []);

  const holidayMap = useMemo(() => {
    const map = new Map<string, boolean>();
    const calData = (academia?.calendarData?.length > 0) ? academia.calendarData : (calendarDataJson || []);
    calData.forEach((item: any) => {
      if (item.type?.toLowerCase().includes("holiday")) {
        const dObj = new Date(item.date);
        if (!isNaN(dObj.getTime())) {
          const dStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, "0")}-${String(dObj.getDate()).padStart(2, "0")}`;
          map.set(dStr, true);
        }
      }
    });
    return map;
  }, [academia, calendarDataJson]);

  const handleDateClick = useCallback((day: number) => {
    const dStr = formatDate(calYear, calMonth, day);
    if (!isRangeMode) {
      setSelectedDates(prev => {
        const next = { ...prev };
        if (next[dStr]) {
          delete next[dStr];
        } else {
          next[dStr] = predictAction;
        }
        return next;
      });
    } else {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(dStr);
        setRangeEnd(null);
        setSelectedDates({ [dStr]: predictAction });
      } else {
        const start = new Date(rangeStart);
        const end = new Date(dStr);
        if (end < start) {
          setRangeStart(dStr);
          setSelectedDates({ [dStr]: predictAction });
        } else {
          setRangeEnd(dStr);
          const nextSelected: Record<string, "leave" | "attend" | "od"> = {};
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            if (!isWeekendStr(dateStr) && !holidayMap.has(dateStr)) {
              nextSelected[dateStr] = predictAction;
            }
          }
          setSelectedDates(nextSelected);
        }
      }
    }
  }, [calYear, calMonth, isRangeMode, rangeStart, rangeEnd, predictAction, formatDate, isWeekendStr, holidayMap]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const baseAttendance = useMemo(
    () => getBaseAttendance(data?.attendance || []),
    [data?.attendance],
  );

  const impactMap = useMemo(() => {
    if (!isPredicting || Object.keys(selectedDates).length === 0) return {};
    const calDataToUse = (academia?.calendarData?.length > 0) ? academia.calendarData : (calendarDataJson || []);
    return getImpactMap(
      selectedDates,
      calDataToUse,
      academia?.effectiveSchedule || data?.schedule || data?.timetable || {},
      baseAttendance
    );
  }, [isPredicting, selectedDates, academia, baseAttendance, data?.schedule, data?.timetable]);

  const processedList = useMemo(() => {
    const list = getProcessedList(
      baseAttendance,
      impactMap,
      isPredicting,
    );
    return list.map((s) => {
      const origStatus = getStatus(
        parseFloat(s.percentage),
        s.conducted,
        s.present,
      );
      
      const calDataToUse = (academia?.calendarData?.length > 0) ? academia.calendarData : (calendarDataJson || []);
      const recDate = getRecoveryDate(
        s, 
        calDataToUse, 
        academia?.effectiveSchedule || data?.schedule || data?.timetable || {},
        selectedDates,
        predictAction
      );

      return {
        ...s,
        displayCode: getAcronym(s.title) || s.code || "SUB",
        fullName: s.title.toLowerCase(),
        percent: s.pred.pct.toFixed(1),
        safe: s.pred.status.safe,
        val: s.pred.status.val,
        sessionsAffected: s.pred.sessionsAffected,
        originalVal: origStatus.val,
        originalLabel: origStatus.label,
        currentLabel: s.pred.status.label,
        hasChanged: s.pred.status.val !== origStatus.val || s.pred.status.label !== origStatus.label,
        recoveryDate: recDate,
      };
    });
  }, [baseAttendance, impactMap, isPredicting, academia, data, selectedDates, predictAction]);

  const actionRequired = useMemo(
    () => processedList.filter((s) => !s.safe).sort((a, b) => b.val - a.val),
    [processedList],
  );
  const safeSubjectsList = useMemo(
    () =>
      processedList
        .filter((s) => s.safe)
        .sort((a, b) => (a.sessionsAffected ? -1 : 1) || a.val - b.val),
    [processedList],
  );

  const stats = useMemo(() => {
    let totalC = 0,
      totalP = 0;
    baseAttendance.forEach((s) => {
      const imp = (impactMap && impactMap[s.id]) || { conducted: 0, present: 0 };
      totalC += s.conducted + imp.conducted;
      totalP += s.present + imp.present;
    });
    
    // Add extra bunks from the quick slider simulator
    const newTotalC = totalC + extraBunks;
    const pct = newTotalC === 0 ? 0 : (totalP / newTotalC) * 100;
    
    const overallStats = getOverallStats(baseAttendance);
    const roast = getRandomRoast(overallStats.badge as any, "header");
    const emergencyRoast = getRandomRoast("cooked", "header");
    
    return { 
      percent: pct.toFixed(1), 
      safe: pct >= 75, 
      conducted: totalC, 
      absent: totalC - totalP, 
      roast, 
      emergencyRoast 
    };
  }, [baseAttendance, impactMap, extraBunks]);

  const projectedDiff = useMemo(() => {
    const origPct = getOverallStats(baseAttendance).pct;
    const projPct = parseFloat(stats.percent);
    const diff = projPct - origPct;
    return (diff >= 0 ? "+" : "") + diff.toFixed(1) + "%";
  }, [baseAttendance, stats.percent]);

  const adjustBunk = (val: number) => {
    Haptics.selection();
    const nextVal = extraBunks + val;
    if (nextVal >= 0 && nextVal <= 15) {
      setExtraBunks(nextVal);
    }
  };

  if (!mounted) return null;

  const percentVal = parseFloat(stats.percent);
  const overallColor = percentVal >= 85 ? "#6ee7f7" : percentVal >= 75 ? "#ffd061" : "#F43F5E";
  const overallTheme = percentVal >= 85 ? "safe" : percentVal >= 75 ? "stable" : "cooked";

  // SVG parameters
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(percentVal, 100) / 100) * circumference;

  return (
    <div className="absolute inset-0 bg-[#0f131f] text-[#dfe1f4] overflow-hidden select-none font-body-lg">
      
      {/* Ambient background glows */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-primary-container/5 rounded-full blur-[80px] pointer-events-none" />

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
            attendance
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-outline-variant/20 overflow-hidden flex items-center justify-center bg-surface-container-high shrink-0 font-bold text-primary-container text-xs">
            {stats.percent}%
          </div>
        </div>
      </header>

      {/* Scroll container */}
      <div
        className="absolute inset-0 overflow-y-auto no-scrollbar"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <motion.main 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="pt-24 pb-32 px-5 max-w-2xl mx-auto space-y-8"
        >
          {/* Circular progress gauge */}
          <motion.section variants={itemVariants} className="glass-panel border border-primary-container/20 rounded-2xl p-8 flex flex-col items-center text-center relative overflow-hidden shadow-xl">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary-container/5 blur-3xl rounded-full"></div>
            
            <div className="relative w-48 h-48 mb-6 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle className="text-surface-container-highest" cx="96" cy="96" fill="transparent" r={radius} stroke="currentColor" strokeWidth="8"></circle>
                <motion.circle 
                  className="text-primary-container" 
                  cx="96" 
                  cy="96" 
                  fill="transparent" 
                  r={radius} 
                  stroke={overallColor} 
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  strokeLinecap="round"
                  style={{
                    filter: `drop-shadow(0 0 4px ${overallColor}80)`
                  }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="font-display-lg text-[36px] font-black text-primary-container" style={{ textShadow: "0 0 10px rgba(110, 231, 247, 0.3)" }}>
                  {stats.percent}%
                </span>
                <span className="font-label-caps text-[9px] text-on-surface-variant uppercase tracking-widest font-extrabold mt-0.5">Aggregate</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="glass-panel rounded-xl p-4 text-left border border-outline-variant/10">
                <span className="font-label-caps text-[10px] text-on-surface-variant block mb-1 font-bold">Hours Conducted</span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container text-[18px]">event_available</span>
                  <span className="font-title-md text-[18px] text-primary font-black">{stats.conducted}</span>
                </div>
              </div>
              <div className="glass-panel rounded-xl p-4 text-left border border-outline-variant/10">
                <span className="font-label-caps text-[10px] text-on-surface-variant block mb-1 font-bold">Hours Absent</span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-alert-rose text-[18px]">event_busy</span>
                  <span className="font-title-md text-[18px] text-on-surface font-black">{stats.absent}</span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Status roast card */}
          <motion.section variants={itemVariants} className="glass-panel bg-primary-container/5 border border-primary-container/20 rounded-2xl p-6 flex items-start gap-4 shadow-md">
            <div className="bg-primary-container/20 p-2.5 rounded-xl border border-primary-container/10 shrink-0 text-primary-container">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>
            <div>
              <h3 className="font-title-md text-[16px] font-bold text-primary-container mb-1 lowercase">
                {overallTheme === "safe" ? "academic safety zone" : "caution advised"}
              </h3>
              <p className="font-body-sm text-[12.5px] text-on-surface-variant font-medium leading-relaxed">
                {overallTheme === "safe" 
                  ? (stats.roast || "your attendance rates are in the safe zone. maintain it!")
                  : (stats.emergencyRoast || "caution! some courses need attention to keep above 75%.")}
              </p>
            </div>
          </motion.section>

          {/* Bunk Forecast Simulator */}
          <motion.section variants={itemVariants} className="space-y-4">
            <h2 className="font-title-md text-[18px] font-bold text-primary-container lowercase flex items-center gap-2 px-1">
              <span className="material-symbols-outlined text-sm">analytics</span>
              bunk forecast
            </h2>
            <div className="glass-panel rounded-2xl p-6 space-y-6 border border-outline-variant/10 shadow-md">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="font-label-caps text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">future classes to bunk</label>
                  <span className="font-title-md text-[24px] font-black text-alert-rose" style={{ textShadow: "0 0 10px rgba(244,63,94,0.3)" }}>
                    {extraBunks}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    className="w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center hover:bg-surface-container-high transition-colors text-lg active:scale-90"
                    onClick={() => adjustBunk(-1)}
                  >
                    -
                  </button>
                  <input 
                    className="flex-1 h-1 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary-container" 
                    id="bunk-slider" 
                    max="15" 
                    min="0" 
                    type="range" 
                    value={extraBunks}
                    onChange={(e) => { Haptics.selection(); setExtraBunks(parseInt(e.target.value)); }}
                  />
                  <button 
                    className="w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center hover:bg-surface-container-high transition-colors text-lg active:scale-90"
                    onClick={() => adjustBunk(1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="pt-4 border-t border-outline-variant/15 flex justify-between items-center">
                <div>
                  <span className="font-label-caps text-[10px] text-on-surface-variant block uppercase tracking-wider">projected %</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-headline-lg text-[22px] font-black text-primary-container" style={{ textShadow: "0 0 8px rgba(110,231,247,0.3)" }}>{stats.percent}%</span>
                    <span className="font-label-caps text-[10px] text-on-surface-variant font-bold">{projectedDiff}</span>
                  </div>
                </div>
                <div className="h-10 w-[1px] bg-outline-variant/20"></div>
                <div className="text-right">
                  <span className="font-label-caps text-[10px] text-on-surface-variant block uppercase tracking-wider">status</span>
                  <span className={`font-title-md text-[16px] font-bold mt-1 block ${percentVal >= 75 ? 'text-primary' : 'text-alert-rose animate-pulse'}`}>
                    {percentVal >= 75 ? 'SAFE' : 'CRITICAL'}
                  </span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Date Picker predictor card */}
          <motion.section variants={itemVariants} className="flex flex-col">
            {!isPredicting ? (
              <button
                onClick={() => { Haptics.selection(); setIsPredictOverlay(true); }}
                className="w-full rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform glass-panel border border-primary-container/20 shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-primary-container/10 border border-primary-container/25 text-primary-container">
                    <Calculator size={18} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-[12px] font-black uppercase tracking-widest text-primary-container leading-none">PREDICT FUTURE</span>
                    <span className="text-[9.5px] font-bold lowercase tracking-wider mt-1 text-on-surface-variant">simulate leaves and od impacts</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-container/10 border border-primary-container/20 text-primary-container">
                  <ChevronRightIcon size={16} strokeWidth={2.5} />
                </div>
              </button>
            ) : (
              <div className="w-full relative group transition-all duration-200">
                <div className="absolute inset-0 bg-[#6EE7F7]/20 rounded-2xl blur-md opacity-40" />
                <div className="relative w-full border border-primary-container bg-slate-950/90 rounded-2xl p-4 flex items-center justify-between shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-container/10 border border-primary-container/25 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[12px] font-black uppercase tracking-widest leading-none text-primary-container">
                        simulating mode
                      </span>
                      <span className="text-[9.5px] font-bold lowercase tracking-wider mt-1 text-on-surface-variant">
                        {Object.keys(selectedDates).length} simulated days ({predictAction})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { Haptics.selection(); setIsPredictOverlay(true); }}
                      className="w-8 h-8 rounded-full bg-primary-container/10 border border-primary-container/20 flex items-center justify-center text-primary-container active:scale-90 transition-transform"
                    >
                      <ChevronRightIcon size={16} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => {
                        Haptics.warning();
                        setIsPredicting(false);
                        setSelectedDates({});
                        setRangeStart(null);
                        setRangeEnd(null);
                      }}
                      className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 active:scale-90 transition-transform"
                    >
                      <X size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.section>

          {/* Sliding segmented control tabs */}
          <motion.section variants={itemVariants} className="flex flex-col">
            <div className="flex gap-1.5 p-1 rounded-full bg-slate-950/45 border border-white/5 shadow-inner">
              {["all", "action", "safe"].map((tab) => {
                const count = tab === "action" ? actionRequired.length : tab === "safe" ? safeSubjectsList.length : processedList.length;
                const isAct = activeTab === tab;
                
                return (
                  <button
                    key={tab}
                    onClick={() => { Haptics.selection(); setActiveTab(tab as any); }}
                    className="flex-1 py-2.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 relative z-10"
                    style={{ color: isAct ? '#050814' : 'rgba(238,242,255,0.45)' }}
                  >
                    <span>{tab}</span>
                    <span className="text-[8px] opacity-60">({count})</span>
                    {isAct && (
                      <motion.div
                        layoutId="activeTabPill"
                        className="absolute inset-0 bg-primary-container rounded-full -z-10 shadow-lg"
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.section>

          {/* List display */}
          <AnimatePresence mode="popLayout">
            {(activeTab === "all" || activeTab === "action") && actionRequired.length > 0 && (
              <motion.section
                key={`action-required-list`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="w-full flex flex-col gap-4"
              >
                <div className="flex items-center gap-3 w-full px-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#FF4D4D] whitespace-nowrap">
                    action required
                  </span>
                  <div className="flex-1 h-[1.5px] bg-[#FF4D4D]/15 rounded-full" />
                </div>

                {actionRequired.map((sub: any) => (
                  <SubjectCard
                    key={sub.id}
                    sub={sub}
                    isPredicting={isPredicting}
                    isExpanded={expandedCard === sub.id}
                    onToggle={() => { Haptics.selection(); setExpandedCard(expandedCard === sub.id ? null : sub.id); }}
                  />
                ))}

                <div className="w-full flex items-center justify-center gap-2 mt-2 mb-2">
                  <UserAvatar seed={profileSeed} className="w-5 h-5 opacity-70" />
                  <div className="text-[11px] font-bold tracking-widest text-[#FF4D4D]/80">
                    {stats.emergencyRoast || "academic danger zone."}
                  </div>
                </div>
              </motion.section>
            )}

            {(activeTab === "all" || activeTab === "safe") && safeSubjectsList.length > 0 && (
              <motion.section
                key={`safe-subjects-list`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col w-full gap-4 pt-2"
              >
                <div className="flex items-center gap-3 w-full px-2 mb-1 mt-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant whitespace-nowrap">
                    safe subjects
                  </span>
                  <div className="flex-1 h-[1.5px] bg-white/5 rounded-full" />
                </div>

                {safeSubjectsList.map((sub: any) => (
                  <SubjectCard
                    key={sub.id}
                    sub={sub}
                    isPredicting={isPredicting}
                    isExpanded={expandedCard === sub.id}
                    onToggle={() => { Haptics.selection(); setExpandedCard(expandedCard === sub.id ? null : sub.id); }}
                  />
                ))}
              </motion.section>
            )}
          </AnimatePresence>

        </motion.main>
      </div>

      <Predict
        isOpen={isPredictOverlay}
        onClose={() => setIsPredictOverlay(false)}
        predictAction={predictAction}
        setPredictAction={setPredictAction}
        calYear={calYear}
        calMonth={calMonth}
        monthName={monthName}
        setCurrentCalDate={setCurrentCalDate}
        startOffset={startOffset}
        daysInMonth={daysInMonth}
        formatDate={formatDate}
        isWeekendStr={isWeekendStr}
        holidayMap={holidayMap}
        isRangeMode={isRangeMode}
        setIsRangeMode={setIsRangeMode}
        rangeStart={rangeStart}
        setRangeStart={setRangeStart}
        setRangeEnd={setRangeEnd}
        selectedDates={selectedDates}
        setSelectedDates={setSelectedDates}
        handleDateClick={handleDateClick}
        setIsPredicting={setIsPredicting}
      />
    </div>
  );
}
