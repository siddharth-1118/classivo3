"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { NOVA, mono, cap, carbonGlass, glassCard, statusBadge, SPRINGS } from "./tokens";
import { Haptics } from "@/utils/shared/haptics";
import { useApp } from "@/context/AppContext";
import { EncryptionUtils } from "@/utils/shared/Encryption";
import { useMonetization } from "@/hooks/useMonetization";
import { AttendanceBunkShieldBadge } from "@/components/monetization/AttendanceBunkShieldBadge";
import { AttendanceBunkShieldModal } from "@/components/monetization/AttendanceBunkShieldModal";
import { TrustScoreStatusPill } from "@/components/monetization/TrustScoreStatusPill";
import { TrustScoreModal } from "@/components/monetization/TrustScoreModal";
import { StudentReferralCard } from "@/components/monetization/StudentReferralCard";
import { StudentReferralModal } from "@/components/monetization/StudentReferralModal";
import { ClassivoProUpgradeCard } from "@/components/monetization/ClassivoProUpgradeCard";
import { ClassivoProUpgradeModal } from "@/components/monetization/ClassivoProUpgradeModal";

function parseDayOrderNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  const match = String(val).match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

const Section = ({ n, label, children }: { n: string; label: string; children: React.ReactNode }) => (
  <section className="px-5 mt-6">
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md shrink-0" style={{ ...mono(), color: NOVA.orange, background: `${NOVA.orange}1a`, border: `1px solid ${NOVA.orange}33` }}>
        {n}
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.22em] truncate" style={{ color: NOVA.muted }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${NOVA.borderStrong} 0%, transparent 100%)` }} />
    </div>
    {children}
  </section>
);

export default function NovaDashboard({
  data,
  academia,
  onOpenSettings,
}: {
  data: any;
  academia: any;
  onOpenSettings: () => void;
}) {
  const router = useRouter();
  const { isUpdating, refreshData, lastSyncAt, connectionSource } = useApp();
  const monetization = useMonetization();
  const profile = data?.profile || {};
  const name = (profile.name || "student").split(" ")[0].toLowerCase();

  let totalConducted = 0;
  let totalPresent = 0;
  if (Array.isArray(data?.attendance)) {
    data.attendance.forEach((a: any) => {
      const c = parseInt(a?.conducted ?? a?.classesHeld ?? a?.held ?? a?.totalClasses ?? "0", 10) || 0;
      const pRaw = a?.present ?? a?.classesAttended ?? a?.attended;
      const abs = parseInt(a?.absent || "0", 10) || 0;
      const p = pRaw !== undefined && pRaw !== null ? (parseInt(pRaw, 10) || 0) : Math.max(0, c - abs);
      totalConducted += c;
      totalPresent += p;
    });
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const att = academia?.overallAttendance ?? 0;
  const attColor = att >= 85 ? NOVA.green : att >= 75 ? NOVA.orange : NOVA.red;
  const marksGot = academia?.totalMarksGot ?? 0;
  const marksMax = academia?.totalMarksMax ?? 0;
  const nextClass = academia?.timeStatus?.nextClass || null;
  const rawDayOrder = academia?.effectiveDayOrder || data?.dayOrder;
  const parsedDayNum = parseDayOrderNumber(rawDayOrder);
  const displayDayOrder = parsedDayNum > 0 ? String(parsedDayNum).padStart(2, "0") : "01";

  const [showWaBanner, setShowWaBanner] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("classivo_wa_banner_dismissed") === "true";
    if (!dismissed) setShowWaBanner(true);
  }, []);

  const dismissWa = () => {
    Haptics.light();
    localStorage.setItem("classivo_wa_banner_dismissed", "true");
    setShowWaBanner(false);
  };

  const joinWa = () => {
    Haptics.heavy();
    window.open("https://chat.whatsapp.com/KCbxvabSvRbK96h67JF3Io", "_blank", "noopener,noreferrer");
  };

  const formatSyncTime = (iso: string | null) => {
    if (!iso) return "Never";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) + ", " +
           d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const quick = [
    { icon: "event_note", label: "agenda", path: "/agenda", color: NOVA.orange },
    { icon: "person", label: "profile", path: "/profile", color: NOVA.blue },
    { icon: "calendar_month", label: "calendar", path: "/calendar", color: NOVA.lime },
    { icon: "auto_stories", label: "marks", path: "/marks", color: NOVA.purple },
  ];

  return (
    <div className="min-h-full pb-16 relative overflow-hidden" style={{ background: NOVA.bg }}>
      {/* Background ambient lighting */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[450px] h-[240px] rounded-full pointer-events-none opacity-20 blur-[130px]" style={{ background: NOVA.lime }} />
      <div className="absolute top-[40%] -right-20 w-[300px] h-[300px] rounded-full pointer-events-none opacity-15 blur-[120px]" style={{ background: NOVA.blue }} />

      {/* Greeting Header */}
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRINGS.smooth}
        className="px-5 pt-7 relative z-10"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md" style={{ background: `${NOVA.lime}14`, border: `1px solid ${NOVA.lime}33` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: NOVA.lime, boxShadow: `0 0 8px ${NOVA.lime}` }} />
            <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ ...mono(), color: NOVA.lime }}>
              {today}
            </p>
          </div>

          <div
            className="px-3 py-1 rounded-full border flex items-center gap-1.5 backdrop-blur-md"
            style={{ background: "rgba(56, 189, 248, 0.08)", borderColor: "rgba(56, 189, 248, 0.25)" }}
          >
            <span className="material-symbols-outlined text-[13px]" style={{ color: NOVA.blue }}>
              cloud_done
            </span>
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ ...mono(), color: NOVA.blue }}>
              Azure Cloud
            </span>
          </div>
        </div>

        <h1 className="text-[34px] font-black tracking-tight mt-2.5 leading-none" style={{ color: NOVA.text }}>
          hi, <span className="bg-gradient-to-r from-lime-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent">{cap(name)}</span>.
        </h1>
      </motion.section>

      {/* WhatsApp Community Banner */}
      {showWaBanner && (
        <motion.section
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRINGS.smooth}
          className="px-5 mt-5 relative z-10"
        >
          <div
            className="rounded-2xl p-4 flex items-center justify-between gap-3 relative overflow-hidden backdrop-blur-2xl transition-all"
            style={{
              ...carbonGlass(NOVA.green, "40"),
              borderLeft: `4px solid ${NOVA.green}`,
            }}
          >
            <button onClick={joinWa} className="flex items-center gap-3 flex-1 text-left min-w-0 transition-all active:scale-[0.99]">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg" style={{ background: `${NOVA.green}22`, border: `1px solid ${NOVA.green}55` }}>
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" style={{ fill: NOVA.green }}>
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.953-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.66.986 3.296 1.5 5.342 1.5 5.361 0 9.724-4.364 9.728-9.728.002-2.584-1.002-5.013-2.83-6.841-1.829-1.828-4.253-2.831-6.837-2.833-5.368 0-9.733 4.362-9.737 9.729-.001 2.074.545 3.791 1.587 5.485L2.83 21.17l4.817-1.262zM17.472 14.382c-.32-.16-1.89-.933-2.185-1.041-.295-.108-.51-.16-.724.162-.213.318-.83.162-1.018.375-.187.213-.375.24-.694.08-.318-.16-1.343-.495-2.56-1.58-1.082-.966-1.748-2.222-1.959-2.581-.213-.36-.022-.554.157-.732.162-.162.36-.424.54-.636.18-.213.24-.363.36-.606.12-.24.06-.45-.03-.61-.09-.16-.724-1.745-.99-2.39-.26-.62-.52-.53-.724-.53-.188-.01-.403-.01-.617-.01-.215 0-.56.08-.853.4-.293.32-1.12 1.1-1.12 2.682 0 1.582 1.15 3.11 1.31 3.324.16.214 2.26 3.454 5.474 4.843.766.33 1.363.527 1.83.675.77.244 1.472.21 2.027.128.618-.092 1.89-.77 2.155-1.48.265-.71.265-1.317.187-1.442-.08-.124-.294-.214-.61-.375z"/>
                </svg>
              </span>
              <div className="min-w-0">
                <h4 className="text-[13px] font-black tracking-tight leading-none" style={{ color: NOVA.text }}>
                  Join Classivo Community
                </h4>
                <p className="text-[10px] font-bold mt-1 leading-tight truncate" style={{ color: NOVA.muted }}>
                  discuss updates &amp; report bugs
                </p>
              </div>
            </button>
            <div className="flex items-center gap-1.5 shrink-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={joinWa}
                className="px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg"
                style={{ ...mono(), background: NOVA.green, color: NOVA.ink, boxShadow: `0 0 14px ${NOVA.green}44` }}
              >
                join
              </motion.button>
              <button
                onClick={dismissWa}
                className="w-7 h-7 rounded-xl flex items-center justify-center transition-all active:scale-90"
                style={{ border: `1px solid ${NOVA.borderStrong}`, background: "rgba(10, 13, 20, 0.6)" }}
              >
                <span className="material-symbols-outlined text-[14px]" style={{ color: NOVA.faint }}>close</span>
              </button>
            </div>
          </div>
        </motion.section>
      )}

      {/* Dual Portal Connection Prompt Banner */}
      {connectionSource === "academia" && !(data as any)?.portalConnected && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRINGS.smooth}
          className="px-5 mt-4 relative z-10"
        >
          <div
            className="rounded-2xl p-4 flex items-center justify-between gap-3 relative overflow-hidden backdrop-blur-2xl transition-all"
            style={{
              ...carbonGlass(NOVA.cyan, "40"),
              borderLeft: `4px solid ${NOVA.cyan}`,
            }}
          >
            <button
              onClick={() => { Haptics.light(); router.push("/connections"); }}
              className="flex items-center gap-3 flex-1 text-left min-w-0 transition-all active:scale-[0.99]"
            >
              <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg" style={{ background: `${NOVA.cyan}22`, border: `1px solid ${NOVA.cyan}55` }}>
                <span className="material-symbols-outlined text-[18px]" style={{ color: NOVA.cyan }}>shield</span>
              </span>
              <div className="min-w-0">
                <h4 className="text-[13px] font-black tracking-tight leading-none" style={{ color: NOVA.text }}>
                  Link SRM Student Portal
                </h4>
                <p className="text-[10px] font-bold mt-1 leading-tight truncate" style={{ color: NOVA.muted }}>
                  Sync Hostel Allotment Order, Fee Receipts &amp; Official Profile
                </p>
              </div>
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => { Haptics.light(); router.push("/connections"); }}
              className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shrink-0"
              style={{ ...mono(), background: NOVA.cyan, color: NOVA.ink, boxShadow: `0 0 14px ${NOVA.cyan}44` }}
            >
              Link Now
            </motion.button>
          </div>
        </motion.section>
      )}

      {/* Today: Day Order + Next Class */}
      <Section n="01" label="today's schedule">
        <div className="grid grid-cols-5 gap-3">
          {/* Day Order Card */}
          <motion.button
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.96 }}
            transition={SPRINGS.smooth}
            onClick={() => { Haptics.light(); router.push("/agenda"); }}
            className="col-span-2 rounded-2xl p-4 text-left flex flex-col justify-between transition-all shadow-xl relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, rgba(168, 255, 0, 0.16) 0%, rgba(20, 28, 42, 0.85) 100%)`,
              border: `1px solid ${NOVA.lime}44`,
              boxShadow: `0 0 24px ${NOVA.lime}15`,
            }}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ ...mono(), color: NOVA.lime }}>
                day order
              </span>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: NOVA.lime, boxShadow: `0 0 6px ${NOVA.lime}` }} />
            </div>

            <div className="mt-2.5">
              <span className="text-[40px] font-black leading-none" style={{ ...mono(), color: NOVA.lime }}>
                {displayDayOrder}
              </span>
            </div>

            <span className="text-[8px] font-black uppercase tracking-widest mt-2 block" style={{ ...mono(), color: NOVA.muted }}>
              tap to view agenda →
            </span>
          </motion.button>

          {/* Next Class Card */}
          <motion.button
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            transition={SPRINGS.smooth}
            onClick={() => { Haptics.light(); router.push("/agenda"); }}
            className="col-span-3 rounded-2xl p-4 text-left flex flex-col justify-between transition-all backdrop-blur-2xl relative overflow-hidden"
            style={{
              ...carbonGlass(NOVA.orange, "35"),
            }}
          >
            <div className="flex items-center justify-between w-full">
              <span
                className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ ...mono(), color: NOVA.ink, background: NOVA.orange, boxShadow: `0 0 10px ${NOVA.orange}44` }}
              >
                next class
              </span>
              <span className="material-symbols-outlined text-[15px]" style={{ color: NOVA.orange }}>
                schedule
              </span>
            </div>

            {nextClass ? (
              <div className="mt-2 min-w-0">
                <p className="text-[13px] font-black tracking-tight leading-tight truncate" style={{ color: NOVA.text }}>
                  {cap(String(nextClass.name || nextClass.course || nextClass.code || "class"))}
                </p>
                <p className="text-[12px] font-black mt-1" style={{ ...mono(), color: NOVA.lime }}>
                  {(nextClass.time || "—").split(" - ")[0]}
                </p>
              </div>
            ) : (
              <p className="text-[11px] font-semibold mt-2" style={{ color: NOVA.faint }}>no classes left today.</p>
            )}

            <span className="text-[8px] font-black uppercase tracking-widest mt-2 block" style={{ ...mono(), color: NOVA.faint }}>
              full schedule →
            </span>
          </motion.button>
        </div>
      </Section>

      {/* Overview Section: Attendance + Marks */}
      <Section n="02" label="overview & performance">
        <div className="grid grid-cols-2 gap-3">
          {/* Attendance Card */}
          <motion.button
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            transition={SPRINGS.smooth}
            onClick={() => { Haptics.light(); router.push("/attendance"); }}
            className="rounded-2xl p-4 text-left relative overflow-hidden backdrop-blur-2xl transition-all"
            style={{
              ...carbonGlass(attColor, "35"),
              borderTop: `3px solid ${attColor}`,
            }}
          >
            <div className="flex items-center justify-between w-full min-w-0 gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${attColor}22`, border: `1px solid ${attColor}55` }}
                >
                  <span className="material-symbols-outlined text-[13px]" style={{ color: attColor }}>analytics</span>
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.16em] truncate" style={{ color: NOVA.muted }}>
                  attendance
                </span>
              </div>
              <span
                className="text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
                style={{ ...mono(), ...statusBadge(attColor, true) }}
              >
                {att >= 75 ? "on track" : "at risk"}
              </span>
            </div>

            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-[36px] font-black leading-none tracking-tight" style={{ ...mono(), color: attColor }}>
                {Number(att).toFixed(1)}
              </span>
              <span className="text-[14px] font-black" style={{ ...mono(), color: NOVA.faint }}>%</span>
            </div>

            <div className="h-1.5 rounded-full mt-2.5 overflow-hidden p-0.5 relative" style={{ background: "rgba(255, 255, 255, 0.05)", border: `1px solid ${NOVA.border}` }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(att, 100)}%`, background: `linear-gradient(90deg, ${attColor}88 0%, ${attColor} 100%)`, boxShadow: `0 0 10px ${attColor}` }}
              />
            </div>
            <p className="text-[8px] font-black uppercase tracking-wider mt-2 truncate" style={{ ...mono(), color: NOVA.faint }}>
              Target: 75% | {att >= 75 ? "Safe" : "Needs Classes"}
            </p>
          </motion.button>

          {/* Marks Card */}
          <motion.button
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            transition={SPRINGS.smooth}
            onClick={() => { Haptics.light(); router.push("/marks"); }}
            className="rounded-2xl p-4 text-left relative overflow-hidden backdrop-blur-2xl transition-all"
            style={{
              ...carbonGlass(NOVA.blue, "35"),
              borderTop: `3px solid ${NOVA.blue}`,
            }}
          >
            <div className="flex items-center justify-between w-full min-w-0 gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${NOVA.blue}22`, border: `1px solid ${NOVA.blue}55` }}
                >
                  <span className="material-symbols-outlined text-[13px]" style={{ color: NOVA.blue }}>auto_stories</span>
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.16em] truncate" style={{ color: NOVA.muted }}>
                  marks
                </span>
              </div>
              <span
                className="text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
                style={{ ...mono(), background: `${NOVA.blue}20`, color: NOVA.blue, border: `1px solid ${NOVA.blue}44` }}
              >
                {marksMax > 0 ? `${Math.round((marksGot / marksMax) * 100)}%` : "0%"}
              </span>
            </div>

            <div className="flex items-baseline gap-1 mt-2">
              {marksMax > 0 ? (
                <>
                  <span className="text-[28px] font-black leading-none tracking-tight" style={{ ...mono(), color: NOVA.blue }}>
                    {marksGot}
                  </span>
                  <span className="text-[14px] font-black" style={{ ...mono(), color: NOVA.faint }}>/</span>
                  <span className="text-[18px] font-black leading-none" style={{ ...mono(), color: NOVA.faint }}>
                    {marksMax}
                  </span>
                </>
              ) : (
                <span className="text-[36px] font-black leading-none" style={{ ...mono(), color: NOVA.blue }}>
                  —
                </span>
              )}
            </div>

            <div className="h-1.5 rounded-full mt-2.5 overflow-hidden p-0.5 relative" style={{ background: "rgba(255, 255, 255, 0.05)", border: `1px solid ${NOVA.border}` }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${marksMax > 0 ? Math.min((marksGot / marksMax) * 100, 100) : 0}%`,
                  background: `linear-gradient(90deg, ${NOVA.blue}88 0%, ${NOVA.blue} 100%)`,
                  boxShadow: `0 0 10px ${NOVA.blue}`,
                }}
              />
            </div>
            <p className="text-[8px] font-black uppercase tracking-wider mt-2 truncate" style={{ ...mono(), color: NOVA.faint }}>
              {marksMax > 0 ? `${Math.round((marksGot / marksMax) * 100)}% average` : "no marks yet"}
            </p>
          </motion.button>
        </div>
      </Section>

      {/* Attendance Bunk Shield Section */}
      <Section n="BUNK" label="attendance bunk shield">
        <AttendanceBunkShieldBadge
          attendedClasses={totalPresent}
          totalClasses={totalConducted}
          targetThresholdPct={monetization.targetBunkPct}
          tierId={monetization.tierId}
          variant="card"
          onOpenModal={monetization.openBunkShieldModal}
          onOpenUpgrade={monetization.openProModal}
        />
      </Section>

      {/* Classivo Pro & Trust Economy Section */}
      <Section n="PRO" label="membership & perks">
        <div className="space-y-3">
          <ClassivoProUpgradeCard
            tierId={monetization.tierId}
            variant="card"
            onOpenUpgrade={monetization.openProModal}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TrustScoreStatusPill
              score={monetization.trustScore}
              tierId={monetization.tierId}
              variant="card"
              onOpenModal={monetization.openTrustModal}
            />
            <StudentReferralCard
              referralCount={monetization.referralCount}
              variant="card"
              onOpenModal={monetization.openReferralModal}
            />
          </div>
        </div>
      </Section>

      {/* Per-subject attendance */}
      {academia?.subjectAttendance && academia.subjectAttendance.length > 0 && (
        <Section n="03" label="subject health">
          <div className="space-y-2">
            {academia.subjectAttendance.map((subj: any, i: number) => {
              const subColor = subj.percentage >= 85 ? NOVA.green : subj.percentage >= 75 ? NOVA.orange : NOVA.red;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, ...SPRINGS.smooth }}
                  className="rounded-2xl px-4 py-3.5 flex items-center gap-3.5 backdrop-blur-xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(20, 27, 44, 0.8) 0%, rgba(13, 17, 28, 0.7) 100%)",
                    border: `1px solid ${NOVA.borderStrong}`,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold truncate" style={{ color: NOVA.text }}>
                      {subj.name}
                    </p>
                    <p className="text-[9.5px] font-bold mt-0.5" style={{ ...mono(), color: NOVA.faint }}>
                      {subj.present}/{subj.conducted} classes
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="w-16 h-2 rounded-full overflow-hidden p-0.5 relative" style={{ background: "rgba(255, 255, 255, 0.05)", border: `1px solid ${NOVA.border}` }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(subj.percentage, 100)}%`, background: subColor, boxShadow: `0 0 8px ${subColor}` }}
                      />
                    </div>
                    <span className="text-[12px] font-black" style={{ ...mono(), color: subColor }}>
                      {subj.percentage}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Shortcuts */}
      <Section n="04" label="shortcuts & navigation">
        <div className="grid grid-cols-4 gap-2.5">
          {quick.map(({ icon, label, path, color }) => (
            <motion.button
              key={label}
              whileHover={{ y: -3, scale: 1.03 }}
              whileTap={{ scale: 0.94 }}
              transition={SPRINGS.smooth}
              onClick={() => { Haptics.light(); router.push(path); }}
              className="rounded-2xl py-3.5 px-2 flex flex-col items-center gap-2 transition-all backdrop-blur-xl"
              style={{
                background: "linear-gradient(145deg, rgba(24, 32, 50, 0.75) 0%, rgba(12, 16, 26, 0.65) 100%)",
                border: `1px solid ${color}33`,
                boxShadow: `0 8px 24px 0 rgba(0, 0, 0, 0.35)`,
              }}
            >
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: `${color}22`, border: `1px solid ${color}44` }}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ color }}>{icon}</span>
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider" style={{ ...mono(), color: NOVA.text }}>{label}</span>
            </motion.button>
          ))}
        </div>

        {/* Settings Glass Action Row */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { Haptics.light(); onOpenSettings(); }}
          className="w-full mt-3 rounded-2xl py-3 px-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest transition-all backdrop-blur-xl"
          style={{
            background: "rgba(18, 24, 38, 0.6)",
            border: `1px solid ${NOVA.borderStrong}`,
            color: NOVA.muted,
          }}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[15px]" style={{ color: NOVA.lime }}>settings</span>
            Settings &amp; App Preferences
          </span>
          <span className="material-symbols-outlined text-[15px]" style={{ color: NOVA.faint }}>arrow_forward</span>
        </motion.button>
      </Section>



      {/* Monetization Modals */}
      <ClassivoProUpgradeModal
        isOpen={monetization.isProModalOpen}
        onClose={monetization.closeProModal}
        currentTierId={monetization.tierId}
        onUpgradeTier={monetization.upgradeTier}
      />

      <AttendanceBunkShieldModal
        isOpen={monetization.isBunkShieldModalOpen}
        onClose={monetization.closeBunkShieldModal}
        attendanceData={data?.attendance || []}
        targetThresholdPct={monetization.targetBunkPct}
        onSelectTargetPct={monetization.changeTargetBunkPct}
        tierId={monetization.tierId}
        onOpenUpgrade={monetization.openProModal}
      />

      <TrustScoreModal
        isOpen={monetization.isTrustModalOpen}
        onClose={monetization.closeTrustModal}
        trustScore={monetization.trustScore}
        tierId={monetization.tierId}
        onUpdateTrustScore={monetization.updateTrustScore}
        onOpenUpgrade={monetization.openProModal}
      />

      <StudentReferralModal
        isOpen={monetization.isReferralModalOpen}
        onClose={monetization.closeReferralModal}
        referralCount={monetization.referralCount}
        onIncrementReferrals={monetization.incrementReferrals}
      />
    </div>
  );
}
