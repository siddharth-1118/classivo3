"use client";
import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Loader } from "lucide-react";
import { getBaseAttendance, getStatus } from "@/utils/attendance/attendanceLogic";
import { buildCourseMap, processAndSortMarks } from "@/utils/marks/marksLogic";
import { getAcronym } from "@/utils/dashboard/timetableLogic";
import calendarDataJson from "@/data/calendar_data.json";
import Alerts from "./Alerts";
import { getStatusLogic } from "@/utils/dashboard/dashboardLogic";
import { AcademiaData } from "@/types";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useDashboardCalendar } from "@/hooks/useDashboardCalendar";
import { useDashboardAlerts } from "@/hooks/useDashboardAlerts";
import { useApp } from "@/context/AppContext";
import { Haptics } from "@/utils/shared/haptics";

const BEZIER = [0.34, 0.15, 0.16, 0.96] as const;

const itemVariant = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: BEZIER },
  },
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

export default function Dashboard({
  data,
  academia,
  onOpenSettings,
  isAlertsOpen,
  setIsAlertsOpen,
  setIsSwipeDisabled,
  startEntrance,
  onRefresh,
  isRefreshing: isParentRefreshing,
}: {
  data: AcademiaData;
  academia: any;
  onOpenSettings: () => void;
  isAlertsOpen: boolean;
  setIsAlertsOpen: (open: boolean) => void;
  setIsSwipeDisabled?: (disabled: boolean) => void;
  startEntrance: boolean;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}) {
  const router = useRouter();
  const { customDisplayName } = useApp();

  const {
    pullY,
    isRefreshing: isLocalRefreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = usePullToRefresh(isAlertsOpen, onRefresh);

  const isRefreshing = isLocalRefreshing || isParentRefreshing;

  const {
    mounted,
    currentDayOrder,
    isHoliday,
  } = useDashboardCalendar(academia, data);

  useEffect(() => {
    if (setIsSwipeDisabled) setIsSwipeDisabled(isAlertsOpen);
  }, [isAlertsOpen, setIsSwipeDisabled]);

  const [customClasses, setCustomClasses] = useState<Record<number, any[]>>({});
  useEffect(() => {
    const fetchCustoms = () => {
      const stored = localStorage.getItem("ratio_custom_classes");
      if (stored) {
        try { setCustomClasses(JSON.parse(stored)); } catch {}
      }
    };
    fetchCustoms();
    window.addEventListener("custom_classes_updated", fetchCustoms);
    return () => window.removeEventListener("custom_classes_updated", fetchCustoms);
  }, []);

  const globalAlias = typeof window !== "undefined" ? localStorage.getItem("app_alias_name") : null;
  const userName = (
    customDisplayName || globalAlias || data?.profile?.name?.split(" ")[0] || "student"
  ).toLowerCase();

  const profile = data?.profile || {};
  const isTargetAudience =
    (profile.dept || "").toLowerCase().includes("computer science and engineering") &&
    String(profile.semester) === "4";

  const { exams, upcomingBreaks, allAlerts } = useDashboardAlerts(academia, isTargetAudience);
  const courseMap = useMemo(() => buildCourseMap(data), [data]);

  // Overall Attendance
  const { overallAttendance, attendanceSafe, criticalMsg } = useMemo(() => {
    if (!data?.attendance || data.attendance.length === 0)
      return { overallAttendance: 0, attendanceSafe: true, criticalMsg: "No attendance data" };
    const base = getBaseAttendance(data.attendance);
    if (base.length === 0)
      return { overallAttendance: 0, attendanceSafe: true, criticalMsg: "No attendance data" };
    let totalC = 0, totalP = 0, minMargin = 99, hasCritical = false;
    base.forEach((sub) => {
      totalC += sub.conducted;
      totalP += sub.present;
      const status = getStatus(parseFloat(sub.percentage), sub.conducted, sub.present);
      if (!status.safe) hasCritical = true;
      if (status.val < minMargin) minMargin = status.val;
    });
    const overallPct = totalC === 0 ? 0 : parseFloat(((totalP / totalC) * 100).toFixed(1));
    return {
      overallAttendance: overallPct,
      attendanceSafe: !hasCritical,
      criticalMsg: hasCritical ? `${minMargin} classes to recover` : `${minMargin} till critical`,
    };
  }, [data?.attendance]);

  // Overall Marks
  const sortedMarks = useMemo(() => {
    return processAndSortMarks(data?.marks || [], courseMap);
  }, [data?.marks, courseMap]);

  const { overallMarks, marksSafe, marksMsg } = useMemo(() => {
    const validMarks = sortedMarks.filter((m) => !m.isNA && m.totalMax !== undefined && m.totalMax > 0);
    if (validMarks.length === 0) {
      return { overallMarks: "—", marksSafe: true, marksMsg: "No marks data" };
    }
    let totalGotSum = 0;
    let totalMaxSum = 0;
    let hasCritical = false;
    let criticalCount = 0;
    validMarks.forEach((m) => {
      totalGotSum += m.totalGot ?? 0;
      totalMaxSum += m.totalMax ?? 0;
      const subPct = (m.totalMax ?? 0) > 0 ? ((m.totalGot ?? 0) / (m.totalMax ?? 0)) * 100 : 0;
      if (subPct <= 50) {
        hasCritical = true;
        criticalCount++;
      }
    });
    const avgPct = totalMaxSum === 0 ? 0 : parseFloat(((totalGotSum / totalMaxSum) * 100).toFixed(1));
    return {
      overallMarks: avgPct,
      marksSafe: !hasCritical,
      marksMsg: hasCritical ? `${criticalCount} subjects below 50%` : "All subjects above 50%",
    };
  }, [sortedMarks]);

  // Next class
  const { nextClass } = useMemo(() => {
    const scheduleData = academia?.effectiveSchedule || data?.timetable || data?.schedule || {};
    return getStatusLogic(
      scheduleData, customClasses, currentDayOrder, currentDayOrder,
      courseMap, isHoliday, academia?.calendarData || [], calendarDataJson || []
    );
  }, [data, academia, currentDayOrder, isHoliday, customClasses, courseMap]);

  const [isSyncingLocal, setIsSyncingLocal] = useState(false);
  const handleSyncClick = async () => {
    if (onRefresh) {
      Haptics.selection();
      setIsSyncingLocal(true);
      try { await onRefresh(); } catch {}
      setIsSyncingLocal(false);
    }
  };

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (!mounted) return null;

  return (
    <div className="relative w-full h-full bg-[#0a0d17] text-[#dfe1f4] overflow-hidden select-none font-body-lg">

      {/* Ambient background glows */}
      <div className="absolute top-[-80px] right-[-80px] w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-60px] w-[280px] h-[280px] bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] w-[200px] h-[200px] bg-cyan-400/3 rounded-full blur-[80px] pointer-events-none" />

      {/* Scrollable body */}
      <div
        className="absolute inset-0 overflow-y-auto no-scrollbar"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        <div
          className="fixed top-0 left-0 w-full flex justify-center pt-8 z-50 pointer-events-none transition-opacity duration-300"
          style={{ opacity: Math.min(pullY / 60, 1), transform: `translateY(${pullY * 0.3}px)` }}
        >
          <Loader
            className="w-6 h-6 text-cyan-400"
            style={{
              animation: isRefreshing ? "spin 1s linear infinite" : "none",
              transform: `rotate(${pullY * 2}deg)`,
            }}
          />
        </div>

        <motion.div style={{ y: pullY }} className="w-full flex flex-col pb-36 max-w-2xl mx-auto">

          {/* ── TOP BAR ── */}
          <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-5 h-16 w-full"
            style={{ background: "rgba(10,13,23,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #E2C974 0%, #818cf8 100%)" }}>
                <span className="material-symbols-outlined text-[16px] text-[#0a0d17] font-black">diamond</span>
              </div>
              <span className="text-[20px] font-black text-white lowercase tracking-tight font-title-md">classivo</span>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncClick}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90"
                style={{ background: "rgba(110,231,247,0.08)", border: "1px solid rgba(110,231,247,0.15)" }}
              >
                <span className={`material-symbols-outlined text-cyan-400 text-[20px] ${(isRefreshing || isSyncingLocal) ? "animate-spin" : ""}`}>sync</span>
              </button>
              <button
                onClick={() => { Haptics.selection(); onOpenSettings(); }}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90"
                style={{ background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.15)" }}
              >
                <span className="material-symbols-outlined text-indigo-400 text-[20px]">settings</span>
              </button>
            </div>
          </header>

          {/* ── GREETING ── */}
          <motion.section
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="px-5 pt-20 pb-5"
          >
            <p className="text-[12px] font-bold text-cyan-400/70 uppercase tracking-[0.2em] mb-1">{todayName} · {todayDate}</p>
            <h1 className="text-[30px] font-black text-white lowercase leading-none tracking-tight">
              hi, {userName} 👋
            </h1>
            <p className="text-[13px] text-white/40 mt-1.5 font-medium">
              {nextClass
                ? `📚 up next — ${nextClass.course.toLowerCase()} · ${nextClass.room || "Lab"}`
                : "ready for your daily academic tasks?"}
            </p>
          </motion.section>

          {/* ── ALERTS MARQUEE ── */}
          {allAlerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="mx-5 mb-4 rounded-2xl overflow-hidden cursor-pointer"
              style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}
              onClick={() => setIsAlertsOpen(true)}
            >
              <style>{`
                @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                .marquee-track { animation: marquee 28s linear infinite; }
              `}</style>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="material-symbols-outlined text-red-400 text-[18px] shrink-0">campaign</span>
                <div className="overflow-hidden flex-1">
                  <div className="whitespace-nowrap flex gap-16 marquee-track">
                    {[...allAlerts, ...allAlerts].map((a: any, i: number) => (
                      <span key={i} className="text-[12px] font-semibold text-red-300">{a.desc}</span>
                    ))}
                  </div>
                </div>
                <span className="material-symbols-outlined text-red-400/50 text-[18px] shrink-0">chevron_right</span>
              </div>
            </motion.div>
          )}

          {/* ── MAIN CONTENT ── */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="px-5 flex flex-col gap-4"
          >

            {/* ── ROW 1: Attendance + Marks ── */}
            <motion.div variants={itemVariant} className="flex gap-4">
              {/* Attendance — large card */}
              <div
                onClick={() => { Haptics.medium(); router.push("/attendance"); }}
                className="flex-1 rounded-3xl p-5 flex flex-col justify-between cursor-pointer relative overflow-hidden group transition-all duration-300 active:scale-[0.98]"
                style={{
                  background: attendanceSafe
                    ? "linear-gradient(145deg, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.04) 100%)"
                    : "linear-gradient(145deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.04) 100%)",
                  border: `1px solid ${attendanceSafe ? "rgba(6,182,212,0.2)" : "rgba(239,68,68,0.2)"}`,
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: attendanceSafe ? "rgba(6,182,212,0.15)" : "rgba(239,68,68,0.15)" }}>
                    <span className="material-symbols-outlined text-[20px]"
                      style={{ color: attendanceSafe ? "#22d3ee" : "#f87171" }}
                      >bar_chart</span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{
                      background: attendanceSafe ? "rgba(6,182,212,0.12)" : "rgba(239,68,68,0.12)",
                      color: attendanceSafe ? "#22d3ee" : "#f87171",
                      border: `1px solid ${attendanceSafe ? "rgba(6,182,212,0.25)" : "rgba(239,68,68,0.25)"}`,
                    }}>
                    {attendanceSafe ? "safe" : "critical"}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-1">Attendance</p>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[42px] font-black leading-none tracking-tighter"
                      style={{ color: attendanceSafe ? "#22d3ee" : "#f87171" }}>
                      {overallAttendance}
                    </span>
                    <span className="text-[18px] font-bold text-white/40">%</span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${overallAttendance}%`,
                        background: attendanceSafe ? "linear-gradient(90deg,#06b6d4,#22d3ee)" : "linear-gradient(90deg,#dc2626,#f87171)",
                        boxShadow: attendanceSafe ? "0 0 8px #06b6d4" : "0 0 8px #dc2626",
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-white/35 mt-1.5 font-semibold">{criticalMsg}</p>
                </div>
              </div>

              {/* Marks — large card */}
              <div
                onClick={() => { Haptics.medium(); router.push("/marks"); }}
                className="flex-1 rounded-3xl p-5 flex flex-col justify-between cursor-pointer relative overflow-hidden group transition-all duration-300 active:scale-[0.98]"
                style={{
                  background: marksSafe
                    ? "linear-gradient(145deg, rgba(52,211,153,0.12) 0%, rgba(52,211,153,0.04) 100%)"
                    : "linear-gradient(145deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.04) 100%)",
                  border: `1px solid ${marksSafe ? "rgba(52,211,153,0.2)" : "rgba(239,68,68,0.2)"}`,
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: marksSafe ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.15)" }}>
                    <span className="material-symbols-outlined text-[20px]"
                      style={{ color: marksSafe ? "#34d399" : "#f87171" }}
                      >menu_book</span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{
                      background: marksSafe ? "rgba(52,211,153,0.12)" : "rgba(239,68,68,0.12)",
                      color: marksSafe ? "#34d399" : "#f87171",
                      border: `1px solid ${marksSafe ? "rgba(52,211,153,0.25)" : "rgba(239,68,68,0.25)"}`,
                    }}>
                    {marksSafe ? "good" : "low"}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-1">Internal Marks</p>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[42px] font-black leading-none tracking-tighter"
                      style={{ color: marksSafe ? "#34d399" : "#f87171" }}>
                      {overallMarks}
                    </span>
                    {overallMarks !== "—" && <span className="text-[18px] font-bold text-white/40">%</span>}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${overallMarks === "—" ? 0 : overallMarks}%`,
                        background: marksSafe ? "linear-gradient(90deg, #10b981, #34d399)" : "linear-gradient(90deg, #dc2626, #f87171)",
                        boxShadow: marksSafe ? "0 0 8px #10b981" : "0 0 8px #dc2626",
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-white/35 mt-1.5 font-semibold">{marksMsg}</p>
                </div>
              </div>
            </motion.div>

            {/* ── ROW 2: Day Order + CGPA ── */}
            <motion.div variants={itemVariant} className="flex gap-4">
              {/* Day Order */}
              <div
                onClick={() => { Haptics.medium(); router.push("/calendar"); }}
                className="flex-1 rounded-[24px] p-4 flex items-center justify-between cursor-pointer transition-all active:scale-95"
                style={{ background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.18)" }}
              >
                <div className="flex flex-col">
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400/60 mb-0.5">Day Order</p>
                  <span className="text-[18px] font-black text-indigo-300 tracking-tight">
                    Day {currentDayOrder || "—"}
                  </span>
                </div>
                <span className="material-symbols-outlined text-indigo-400 text-[20px]">calendar_today</span>
              </div>

              {/* CGPA */}
              <div
                onClick={() => { Haptics.medium(); router.push("/marks"); }}
                className="flex-1 rounded-[24px] p-4 flex items-center justify-between cursor-pointer transition-all active:scale-95"
                style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)" }}
              >
                <div className="flex flex-col">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-400/60 mb-0.5">CGPA</p>
                  <span className="text-[18px] font-black text-amber-300 tracking-tight">
                    {profile.cgpa || "—"}
                  </span>
                </div>
                <span className="material-symbols-outlined text-amber-400 text-[20px]">military_tech</span>
              </div>
            </motion.div>

            {/* ── ROW 2: Up Next (Timetable) ── */}
            <motion.div variants={itemVariant}>
              <div
                onClick={() => { Haptics.medium(); router.push("/timetable"); }}
                className="w-full rounded-3xl p-5 cursor-pointer transition-all active:scale-[0.98]"
                style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.18)" }}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-[18px]">schedule</span>
                    <p className="text-[11px] font-black uppercase tracking-widest text-emerald-400/70">Up Next</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                </div>
                {nextClass ? (
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 px-3 py-2.5 rounded-2xl text-center"
                      style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}>
                      <p className="text-[13px] font-black text-emerald-300 leading-none">{nextClass.time || "—"}</p>
                      <p className="text-[9px] font-bold text-emerald-400/50 uppercase mt-0.5">slot {nextClass.slot}</p>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[17px] font-black text-white leading-tight truncate">
                        {getAcronym(nextClass.course) || nextClass.course}
                      </p>
                      <p className="text-[12px] text-white/40 mt-0.5 truncate">{nextClass.room || "Lab"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] text-white/35 font-medium">No upcoming lectures today</p>
                )}
              </div>
            </motion.div>

            {/* ── ROW 3: Quick Access Grid ── */}
            <motion.div variants={itemVariant}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25 mb-3 ml-1">Quick Access</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: "menu_book", label: "Marks", color: "#818cf8", bg: "rgba(129,140,248,0.09)", border: "rgba(129,140,248,0.18)", action: () => router.push("/marks") },
                  { icon: "calendar_month", label: "Calendar", color: "#34d399", bg: "rgba(52,211,153,0.09)", border: "rgba(52,211,153,0.18)", action: () => router.push("/calendar") },
                  { icon: "find_in_page", label: "Lost+Found", color: "#f87171", bg: "rgba(248,113,113,0.09)", border: "rgba(248,113,113,0.18)", action: () => router.push("/lost-found") },
                ].map(({ icon, label, color, bg, border, action }) => (
                  <div
                    key={label}
                    onClick={() => { Haptics.light(); action(); }}
                    className="rounded-2xl p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-90 text-center"
                    style={{ background: bg, border: `1px solid ${border}` }}
                  >
                    <span className="material-symbols-outlined text-[22px]" style={{ color }}>{icon}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider leading-tight" style={{ color: `${color}99` }}>{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>


            {/* ── ROW 4: Lost & Found + Exams side-by-side ── */}
            <motion.div variants={itemVariant} className="flex gap-4">

              {/* Exams */}
              <div className="flex-1 rounded-3xl p-5"
                style={{ background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.18)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-violet-400 text-[18px]">event</span>
                    <p className="text-[11px] font-black uppercase tracking-widest text-violet-400/70">Exams</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {exams.length > 0 ? exams.slice(0, 3).map((ex: any) => (
                    <div key={ex.id} className="flex items-center gap-2 p-2 rounded-xl"
                      style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.12)" }}>
                      <span className="text-[10px] font-black text-violet-300 shrink-0">
                        {ex.date.split("/").slice(0, 2).join(".")}
                      </span>
                      <span className="text-[10px] text-white/60 truncate font-semibold lowercase">{ex.desc}</span>
                    </div>
                  )) : (
                    <p className="text-[11px] text-white/25 font-medium">no exams scheduled</p>
                  )}
                </div>
              </div>

              {/* Lost & Found */}
              <div
                onClick={() => { Haptics.heavy(); router.push("/lost-found"); }}
                className="w-[130px] rounded-3xl p-5 flex flex-col justify-between cursor-pointer relative overflow-hidden transition-all active:scale-[0.97]"
                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <div className="absolute top-3 right-3">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
                  </span>
                </div>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: "rgba(239,68,68,0.14)" }}>
                  <span className="material-symbols-outlined text-red-400 text-[20px]">find_in_page</span>
                </div>
                <div>
                  <p className="text-[13px] font-black text-white leading-tight">Lost &amp; Found</p>
                  <p className="text-[10px] text-white/35 mt-1 leading-snug">campus-wide feed</p>
                  <div className="flex items-center gap-1 mt-3 text-red-400">
                    <span className="text-[10px] font-black uppercase">View</span>
                    <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── ROW 5: Profile Info strip (no avatar) ── */}
            <motion.div variants={itemVariant}>
              <div
                onClick={() => { Haptics.light(); onOpenSettings(); }}
                className="w-full rounded-3xl px-5 py-4 flex items-center justify-between cursor-pointer transition-all active:scale-[0.98]"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg,rgba(110,231,247,0.15),rgba(129,140,248,0.15))", border: "1px solid rgba(110,231,247,0.2)" }}>
                    <span className="material-symbols-outlined text-[18px] text-cyan-400">person</span>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[14px] font-black text-white lowercase truncate">{profile.name || "Student"}</p>
                    <p className="text-[10px] text-white/35 font-bold uppercase tracking-wider truncate">{profile.regNo || ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-white/25 uppercase tracking-wider hidden sm:block">settings</span>
                  <span className="material-symbols-outlined text-white/20 text-[18px]">chevron_right</span>
                </div>
              </div>
            </motion.div>

          </motion.div>
        </motion.div>
      </div>

      {/* Announcements dialog */}
      <Alerts
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        exams={exams}
        upcomingBreaks={upcomingBreaks}
      />
    </div>
  );
}