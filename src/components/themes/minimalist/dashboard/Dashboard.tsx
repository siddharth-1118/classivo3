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

  // State for dismissible APK banner
  const [showApkBanner, setShowApkBanner] = useState(false);
  const apkUrl = process.env.NEXT_PUBLIC_APK_URL || "https://classivo3.onrender.com/classivo.apk";

  useEffect(() => {
    const isNative = typeof window !== "undefined" && !!(window as any).Capacitor;
    const dismissed = localStorage.getItem("classivo_apk_banner_dismissed") === "true";
    if (!isNative && !dismissed) {
      setShowApkBanner(true);
    }
  }, []);

  const handleDismissBanner = (e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.light();
    localStorage.setItem("classivo_apk_banner_dismissed", "true");
    setShowApkBanner(false);
  };

  const handleDownloadApk = () => {
    Haptics.heavy();
    window.location.href = apkUrl;
  };

  // State for dismissible WhatsApp Group Join banner
  const [showWaBanner, setShowWaBanner] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("classivo_wa_banner_dismissed") === "true";
    if (!dismissed) {
      setShowWaBanner(true);
    }
  }, []);

  const handleDismissWaBanner = (e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.light();
    localStorage.setItem("classivo_wa_banner_dismissed", "true");
    setShowWaBanner(false);
  };

  const handleJoinWaGroup = () => {
    Haptics.heavy();
    window.open("https://chat.whatsapp.com/KCbxvabSvRbK96h67JF3Io", "_blank", "noopener,noreferrer");
  };

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
      const stored = localStorage.getItem("classivo_custom_classes");
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
    <div className="relative w-full h-full bg-[#05060a] text-[#dfe1f4] overflow-hidden select-none font-body-lg">

      {/* Ambient aurora background glows */}
      <div className="absolute top-[-100px] right-[-80px] w-[320px] h-[320px] bg-cyan-500/7 rounded-full blur-[110px] pointer-events-none animate-aurora" />
      <div className="absolute bottom-[-80px] left-[-80px] w-[300px] h-[300px] bg-violet-500/7 rounded-full blur-[110px] pointer-events-none animate-aurora" style={{ animationDelay: "-3s" }} />
      <div className="absolute top-[35%] left-[55%] w-[220px] h-[220px] bg-amber-300/4 rounded-full blur-[90px] pointer-events-none animate-aurora" style={{ animationDelay: "-6s" }} />

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

        <motion.div style={{ y: pullY }} className="w-full flex flex-col pb-40 max-w-2xl mx-auto">

          {/* ── TOP BAR ── */}
          <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-5 h-16 w-full"
            style={{ background: "rgba(5,6,10,0.75)", backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)", borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center gradient-brand shadow-[0_4px_16px_rgba(34,211,238,0.35)]">
                <span className="material-symbols-outlined text-[16px] text-[#05060a] font-black">diamond</span>
              </div>
              <span className="text-[20px] font-black text-white lowercase tracking-tight font-title-md">classivo</span>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncClick}
                className="icon-btn"
                style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)" }}
              >
                <span className={`material-symbols-outlined text-cyan-400 text-[20px] ${(isRefreshing || isSyncingLocal) ? "animate-spin" : ""}`}>sync</span>
              </button>
              <button
                onClick={() => { Haptics.selection(); onOpenSettings(); }}
                className="icon-btn"
                style={{ background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.2)" }}
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
            <div className="flex items-center gap-2 mb-2">
              <span className="glow-dot" />
              <p className="text-[11px] font-bold text-cyan-300/70 uppercase tracking-[0.22em]">{todayName} · {todayDate}</p>
            </div>
            <h1 className="text-[32px] font-black text-white lowercase leading-none tracking-tight">
              hi, <span className="gradient-text-brand">{userName}</span>
            </h1>
            <p className="text-[13px] text-white/40 mt-2 font-medium">
              {nextClass
                ? `📚 up next — ${(nextClass.name || nextClass.course || nextClass.code || "").toLowerCase()} · ${nextClass.room || "Lab"}`
                : "ready for your daily academic tasks?"}
            </p>
          </motion.section>

          {/* ── ALERTS MARQUEE ── */}
          {allAlerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="mx-5 mb-4 rounded-2xl overflow-hidden cursor-pointer glass-card-red"
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

          {/* ── APK DOWNLOAD BANNER ── */}
          {showApkBanner && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-5 mb-4 rounded-3xl p-4 flex items-center justify-between relative overflow-hidden transition-all duration-300 aurora-surface aurora-surface-hover"
              style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.12) 0%, rgba(129,140,248,0.12) 100%)", border: "1px solid rgba(34,211,238,0.25)" }}
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-3.5 flex-1 pr-4 cursor-pointer relative z-10" onClick={handleDownloadApk}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 gradient-brand-soft border border-cyan-400/20">
                  <span className="material-symbols-outlined text-[22px] text-cyan-300">android</span>
                </div>
                <div>
                  <h4 className="text-[14px] font-black text-white lowercase tracking-tight leading-none mb-1">
                    install classivo for android
                  </h4>
                  <p className="text-[11px] text-white/50 font-semibold leading-tight">
                    get faster updates and offline timetable access
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 relative z-10">
                <button
                  onClick={handleDownloadApk}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider gradient-brand text-[#05060a] hover:brightness-110 active:scale-95 transition-all"
                >
                  install
                </button>
                <button
                  onClick={handleDismissBanner}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 text-white/40 hover:text-white/60 active:scale-90 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ── WHATSAPP GROUP JOIN BANNER ── */}
          {showWaBanner && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-5 mb-4 rounded-3xl p-4 flex items-center justify-between relative overflow-hidden transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, rgba(52,211,153,0.09) 0%, rgba(16,185,129,0.05) 100%)",
                border: "1px solid rgba(52,211,153,0.2)",
              }}
            >
              <div className="flex items-center gap-3.5 flex-1 pr-4 cursor-pointer" onClick={handleJoinWaGroup}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.2)" }}>
                  <svg className="w-[20px] h-[20px] fill-emerald-400" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.66.986 3.296 1.5 5.342 1.5 5.361 0 9.724-4.364 9.728-9.728.002-2.584-1.002-5.013-2.83-6.841-1.829-1.828-4.253-2.831-6.837-2.833-5.368 0-9.733 4.362-9.737 9.729-.001 2.074.545 3.791 1.587 5.485L2.83 21.17l4.817-1.262zM17.472 14.382c-.32-.16-1.89-.933-2.185-1.041-.295-.108-.51-.16-.724.162-.213.318-.83.162-1.018.375-.187.213-.375.24-.694.08-.318-.16-1.343-.495-2.56-1.58-1.082-.966-1.748-2.222-1.959-2.581-.213-.36-.022-.554.157-.732.162-.162.36-.424.54-.636.18-.213.24-.363.36-.606.12-.24.06-.45-.03-.61-.09-.16-.724-1.745-.99-2.39-.26-.62-.52-.53-.724-.53-.188-.01-.403-.01-.617-.01-.215 0-.56.08-.853.4-.293.32-1.12 1.1-1.12 2.682 0 1.582 1.15 3.11 1.31 3.324.16.214 2.26 3.454 5.474 4.843.766.33 1.363.527 1.83.675.77.244 1.472.21 2.027.128.618-.092 1.89-.77 2.155-1.48.265-.71.265-1.317.187-1.442-.08-.124-.294-.214-.61-.375z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="text-[14px] font-black text-white lowercase tracking-tight leading-none mb-1">
                    join classivo community
                  </h4>
                  <p className="text-[11px] text-white/50 font-semibold leading-tight">
                    discuss updates, share ideas, and report bugs
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleJoinWaGroup}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white text-black hover:bg-white/90 active:scale-95 transition-all"
                >
                  join
                </button>
                <button
                  onClick={handleDismissWaBanner}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 text-white/40 hover:text-white/60 active:scale-90 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
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
                className="flex-1 rounded-[26px] p-5 flex flex-col justify-between cursor-pointer relative overflow-hidden group transition-all duration-300 active:scale-[0.98] aurora-surface aurora-surface-hover"
                style={{
                  background: attendanceSafe
                    ? "linear-gradient(150deg, rgba(34,211,238,0.13) 0%, rgba(34,211,238,0.03) 100%)"
                    : "linear-gradient(150deg, rgba(248,113,113,0.13) 0%, rgba(248,113,113,0.03) 100%)",
                  border: `1px solid ${attendanceSafe ? "rgba(34,211,238,0.22)" : "rgba(248,113,113,0.24)"}`,
                }}
              >
                <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl pointer-events-none"
                  style={{ background: attendanceSafe ? "rgba(34,211,238,0.12)" : "rgba(248,113,113,0.12)" }} />
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: attendanceSafe ? "rgba(34,211,238,0.15)" : "rgba(248,113,113,0.15)", border: `1px solid ${attendanceSafe ? "rgba(34,211,238,0.25)" : "rgba(248,113,113,0.25)"}` }}>
                    <span className="material-symbols-outlined text-[20px]"
                      style={{ color: attendanceSafe ? "#22d3ee" : "#f87171" }}
                      >bar_chart</span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full chip"
                    style={{
                      background: attendanceSafe ? "rgba(34,211,238,0.12)" : "rgba(248,113,113,0.12)",
                      color: attendanceSafe ? "#22d3ee" : "#f87171",
                      border: `1px solid ${attendanceSafe ? "rgba(34,211,238,0.25)" : "rgba(248,113,113,0.25)"}`,
                    }}>
                    {attendanceSafe ? "safe" : "critical"}
                  </span>
                </div>
                <div className="relative z-10">
                  <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-1">Attendance</p>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[42px] font-black leading-none tracking-tighter"
                      style={{ color: attendanceSafe ? "#22d3ee" : "#f87171", textShadow: attendanceSafe ? "0 0 24px rgba(34,211,238,0.35)" : "0 0 24px rgba(248,113,113,0.35)" }}>
                      {overallAttendance}
                    </span>
                    <span className="text-[18px] font-bold text-white/40">%</span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${overallAttendance}%`,
                        background: attendanceSafe ? "linear-gradient(90deg,#0891b2,#22d3ee)" : "linear-gradient(90deg,#dc2626,#f87171)",
                        boxShadow: attendanceSafe ? "0 0 10px rgba(34,211,238,0.6)" : "0 0 10px rgba(248,113,113,0.6)",
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-white/35 mt-1.5 font-semibold">{criticalMsg}</p>
                </div>
              </div>

              {/* Marks — large card */}
              <div
                onClick={() => { Haptics.medium(); router.push("/marks"); }}
                className="flex-1 rounded-[26px] p-5 flex flex-col justify-between cursor-pointer relative overflow-hidden group transition-all duration-300 active:scale-[0.98] aurora-surface aurora-surface-hover"
                style={{
                  background: marksSafe
                    ? "linear-gradient(150deg, rgba(52,211,153,0.13) 0%, rgba(52,211,153,0.03) 100%)"
                    : "linear-gradient(150deg, rgba(248,113,113,0.13) 0%, rgba(248,113,113,0.03) 100%)",
                  border: `1px solid ${marksSafe ? "rgba(52,211,153,0.22)" : "rgba(248,113,113,0.24)"}`,
                }}
              >
                <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl pointer-events-none"
                  style={{ background: marksSafe ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)" }} />
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: marksSafe ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)", border: `1px solid ${marksSafe ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)"}` }}>
                    <span className="material-symbols-outlined text-[20px]"
                      style={{ color: marksSafe ? "#34d399" : "#f87171" }}
                      >menu_book</span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full chip"
                    style={{
                      background: marksSafe ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
                      color: marksSafe ? "#34d399" : "#f87171",
                      border: `1px solid ${marksSafe ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)"}`,
                    }}>
                    {marksSafe ? "good" : "low"}
                  </span>
                </div>
                <div className="relative z-10">
                  <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-1">Internal Marks</p>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[42px] font-black leading-none tracking-tighter"
                      style={{ color: marksSafe ? "#34d399" : "#f87171", textShadow: marksSafe ? "0 0 24px rgba(52,211,153,0.35)" : "0 0 24px rgba(248,113,113,0.35)" }}>
                      {overallMarks}
                    </span>
                    {overallMarks !== "—" && <span className="text-[18px] font-bold text-white/40">%</span>}
                  </div>
                  <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${overallMarks === "—" ? 0 : overallMarks}%`,
                        background: marksSafe ? "linear-gradient(90deg, #059669, #34d399)" : "linear-gradient(90deg, #dc2626, #f87171)",
                        boxShadow: marksSafe ? "0 0 10px rgba(52,211,153,0.6)" : "0 0 10px rgba(248,113,113,0.6)",
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-white/35 mt-1.5 font-semibold">{marksMsg}</p>
                </div>
              </div>
            </motion.div>

            {/* ── ROW 2: Day Order + CGPA ── */}
            <motion.div variants={itemVariant} className="flex gap-4">
              <div
                onClick={() => { Haptics.medium(); router.push("/calendar"); }}
                className="flex-1 rounded-3xl p-4 flex items-center justify-between cursor-pointer transition-all active:scale-95 aurora-surface aurora-surface-hover"
                style={{ background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.2)" }}
              >
                <div className="flex flex-col">
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400/60 mb-0.5">Day Order</p>
                  <span className="text-[18px] font-black text-indigo-300 tracking-tight">
                    Day {currentDayOrder || "—"}
                  </span>
                </div>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.2)" }}>
                  <span className="material-symbols-outlined text-indigo-400 text-[18px]">calendar_today</span>
                </span>
              </div>

              <div
                onClick={() => { Haptics.medium(); router.push("/marks"); }}
                className="flex-1 rounded-3xl p-4 flex items-center justify-between cursor-pointer transition-all active:scale-95 aurora-surface aurora-surface-hover"
                style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)" }}
              >
                <div className="flex flex-col">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-400/60 mb-0.5">CGPA</p>
                  <span className="text-[18px] font-black text-amber-300 tracking-tight">
                    {profile.cgpa || "—"}
                  </span>
                </div>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.2)" }}>
                  <span className="material-symbols-outlined text-amber-400 text-[18px]">military_tech</span>
                </span>
              </div>
            </motion.div>

            {/* ── ROW 3: Up Next (Timetable) ── */}
            <motion.div variants={itemVariant}>
              <div
                onClick={() => { Haptics.medium(); router.push("/timetable"); }}
                className="w-full rounded-[26px] p-5 cursor-pointer transition-all active:scale-[0.98] aurora-surface aurora-surface-hover"
                style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-[18px]">schedule</span>
                    <p className="text-[11px] font-black uppercase tracking-widest text-emerald-400/70">Up Next</p>
                  </div>
                  <span className="glow-dot" />
                </div>
                {nextClass ? (
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 px-3 py-2.5 rounded-2xl text-center"
                      style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.22)" }}>
                      <p className="text-[13px] font-black text-emerald-300 leading-none">{nextClass.time || "—"}</p>
                      <p className="text-[9px] font-bold text-emerald-400/50 uppercase mt-0.5">slot {nextClass.slot}</p>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[17px] font-black text-white leading-tight truncate">
                        {nextClass.code || getAcronym(nextClass.name || nextClass.course) || nextClass.name || nextClass.course}
                      </p>
                      <p className="text-[12px] text-white/40 mt-0.5 truncate">{nextClass.room || "Lab"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] text-white/35 font-medium">No upcoming lectures today</p>
                )}
              </div>
            </motion.div>

            {/* ── ROW 4: Quick Access Grid ── */}
            <motion.div variants={itemVariant}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25 mb-3 ml-1">Quick Access</p>
              <div className="grid grid-cols-4 gap-2.5">
                {[
                  { icon: "menu_book", label: "Marks", color: "#818cf8", bg: "rgba(129,140,248,0.09)", border: "rgba(129,140,248,0.2)", action: () => router.push("/marks") },
                  { icon: "calendar_month", label: "Calendar", color: "#34d399", bg: "rgba(52,211,153,0.09)", border: "rgba(52,211,153,0.2)", action: () => router.push("/calendar") },
                  { icon: "event_note", label: "Agenda", color: "#f472b6", bg: "rgba(244,114,182,0.09)", border: "rgba(244,114,182,0.2)", action: () => router.push("/timetable") },
                  { icon: "person", label: "Profile", color: "#22d3ee", bg: "rgba(34,211,238,0.09)", border: "rgba(34,211,238,0.2)", action: () => router.push("/profile") },
                ].map(({ icon, label, color, bg, border, action }) => (
                  <div
                    key={label}
                    onClick={() => { Haptics.light(); action(); }}
                    className="rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-90 text-center aurora-surface-hover hover:border-white/20"
                    style={{ background: bg, border: `1px solid ${border}` }}
                  >
                    <span className="material-symbols-outlined text-[20px]" style={{ color, filter: `drop-shadow(0 0 8px ${color}55)` }}>{icon}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider leading-tight" style={{ color: `${color}cc` }}>{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ── ROW 5: Exams ── */}
            <motion.div variants={itemVariant} className="w-full">
              <div className="w-full rounded-[26px] p-5 aurora-surface"
                style={{ background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.2)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-violet-400 text-[18px]">event</span>
                    <p className="text-[11px] font-black uppercase tracking-widest text-violet-400/70">Exams</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {exams.length > 0 ? exams.slice(0, 3).map((ex: any) => (
                    <div key={ex.id} className="flex items-center gap-3 p-2.5 rounded-xl"
                      style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.14)" }}>
                      <span className="w-12 text-[10px] font-black text-violet-300 shrink-0 text-center px-1.5 py-1 rounded-lg" style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)" }}>
                        {ex.date.split("/").slice(0, 2).join(".")}
                      </span>
                      <span className="text-[10px] text-white/60 truncate font-semibold lowercase">{ex.desc}</span>
                    </div>
                  )) : (
                    <p className="text-[11px] text-white/25 font-medium">no exams scheduled</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* ── ROW 6: Profile Info strip ── */}
            <motion.div variants={itemVariant}>
              <div
                onClick={() => { Haptics.light(); onOpenSettings(); }}
                className="w-full rounded-[26px] px-5 py-4 flex items-center justify-between cursor-pointer transition-all active:scale-[0.98] aurora-surface aurora-surface-hover"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.14)" }}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 gradient-brand-soft"
                    style={{ border: "1px solid rgba(110,231,247,0.25)" }}>
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
