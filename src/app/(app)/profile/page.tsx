"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import { Haptics } from "@/utils/shared/haptics";
import { EncryptionUtils } from "@/utils/shared/Encryption";
import NovaProfile from "@/components/themes/nova/NovaProfile";
import { useMonetization } from "@/hooks/useMonetization";
import { AttendanceBunkShieldBadge } from "@/components/monetization/AttendanceBunkShieldBadge";
import { AttendanceBunkShieldModal } from "@/components/monetization/AttendanceBunkShieldModal";
import { TrustScoreStatusPill } from "@/components/monetization/TrustScoreStatusPill";
import { TrustScoreModal } from "@/components/monetization/TrustScoreModal";
import { StudentReferralCard } from "@/components/monetization/StudentReferralCard";
import { StudentReferralModal } from "@/components/monetization/StudentReferralModal";
import { ClassivoProUpgradeCard } from "@/components/monetization/ClassivoProUpgradeCard";
import { ClassivoProUpgradeModal } from "@/components/monetization/ClassivoProUpgradeModal";

const BEZIER = [0.34, 0.15, 0.16, 0.96] as const;

const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: BEZIER } },
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <motion.div
      variants={itemVariant}
      className="flex items-center gap-4 py-4 border-b border-white/[0.05] last:border-0"
    >
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(110,231,247,0.14)" }}
      >
        <span className="material-symbols-outlined text-cyan-400 text-[18px]">{icon}</span>
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-0.5">
          {label}
        </span>
        <span className="text-[14px] font-bold text-white/85 truncate">{value}</span>
      </div>
    </motion.div>
  );
}

export default function ProfilePage() {
  const { userData, logout } = useApp();
  const { uiStyle } = useTheme();
  const router = useRouter();
  const monetization = useMonetization();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  let totalConducted = 0;
  let totalPresent = 0;
  if (Array.isArray(userData?.attendance)) {
    userData.attendance.forEach((a: any) => {
      const c = parseInt(a?.conducted ?? a?.classesHeld ?? a?.held ?? a?.totalClasses ?? "0", 10) || 0;
      const pRaw = a?.present ?? a?.classesAttended ?? a?.attended;
      const abs = parseInt(a?.absent || "0", 10) || 0;
      const p = pRaw !== undefined && pRaw !== null ? (parseInt(pRaw, 10) || 0) : Math.max(0, c - abs);
      totalConducted += c;
      totalPresent += p;
    });
  }

  if (uiStyle === "nova") {
    return <NovaProfile />;
  }

  const profile = userData?.profile;
  const name = profile?.name || "Student";
  const initials = getInitials(name);

  const handleLogout = async () => {
    Haptics.heavy();
    setLoggingOut(true);
    try {
      await logout();
    } catch {}
    setLoggingOut(false);
  };

  return (
    <div className="min-h-full w-full bg-[#05060a] text-white relative overflow-hidden">
      {/* Ambient glows */}
      <div className="fixed top-[-80px] right-[-60px] w-[280px] h-[280px] bg-cyan-500/6 rounded-full blur-[100px] pointer-events-none animate-aurora" />
      <div className="fixed bottom-[-80px] left-[-60px] w-[260px] h-[260px] bg-violet-500/6 rounded-full blur-[100px] pointer-events-none animate-aurora" style={{ animationDelay: "-4s" }} />

      {/* Top Bar */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-5 h-16 max-w-2xl mx-auto"
        style={{
          background: "rgba(5,6,10,0.8)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(148,163,184,0.08)",
        }}
      >
        <button
          onClick={() => { Haptics.light(); router.back(); }}
          className="icon-btn w-9 h-9"
        >
          <span className="material-symbols-outlined text-white/70 text-[20px]">arrow_back</span>
        </button>
        <span className="text-[13px] font-black uppercase tracking-[0.2em] text-white/60">
          profile
        </span>
        <div className="w-9 h-9" />
      </header>

      {/* Scrollable content */}
      <div className="pt-16 pb-32 px-5 max-w-2xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-5 mt-6"
        >
          {/* Avatar + Name Hero */}
          <motion.div
            variants={itemVariant}
            className="flex flex-col items-center gap-4 py-8 rounded-3xl relative overflow-hidden aurora-surface"
            style={{
              background: "linear-gradient(135deg, rgba(34,211,238,0.07) 0%, rgba(129,140,248,0.07) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Subtle glow behind avatar */}
            <div className="absolute top-4 w-[100px] h-[100px] bg-cyan-400/10 rounded-full blur-[30px] pointer-events-none" />
            {/* Avatar circle */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-[28px] font-black relative z-10 gradient-brand"
              style={{
                color: "#05060a",
                boxShadow: "0 0 44px rgba(110,231,247,0.35)",
              }}
            >
              {initials}
            </div>
            <div className="flex flex-col items-center gap-1 relative z-10">
              <h1 className="text-[22px] font-black text-white lowercase tracking-tight">
                {name.toLowerCase()}
              </h1>
              {profile?.regNo && (
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.22em] px-3 py-1 rounded-full chip"
                  style={{
                    background: "rgba(34,211,238,0.12)",
                    color: "#6ee7f7",
                    border: "1px solid rgba(110,231,247,0.22)",
                  }}
                >
                  {profile.regNo}
                </span>
              )}
            </div>
          </motion.div>

          {/* CGPA highlight card */}
          {profile?.cgpa && (
            <motion.div
              variants={itemVariant}
              className="flex items-center justify-between px-6 py-5 rounded-3xl aurora-surface"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(129,140,248,0.08) 100%)",
                border: "1px solid rgba(129,140,248,0.22)",
              }}
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/60 mb-1">
                  CGPA
                </span>
                <span className="text-[36px] font-black text-white leading-none">
                  {profile.cgpa}
                </span>
              </div>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(129,140,248,0.15)", border: "1px solid rgba(129,140,248,0.22)" }}
              >
                <span className="material-symbols-outlined text-indigo-400 text-[28px]">school</span>
              </div>
            </motion.div>
          )}

          {/* Monetization & Growth Widgets */}
          <motion.div variants={itemVariant}>
            <ClassivoProUpgradeCard
              tierId={monetization.tierId}
              variant="card"
              onOpenUpgrade={monetization.openProModal}
            />
          </motion.div>

          <motion.div variants={itemVariant}>
            <AttendanceBunkShieldBadge
              attendedClasses={totalPresent}
              totalClasses={totalConducted}
              targetThresholdPct={monetization.targetBunkPct}
              tierId={monetization.tierId}
              variant="card"
              onOpenModal={monetization.openBunkShieldModal}
              onOpenUpgrade={monetization.openProModal}
            />
          </motion.div>

          <motion.div variants={itemVariant} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </motion.div>

          {/* Info card */}
          <motion.div
            variants={itemVariant}
            className="rounded-3xl px-5 aurora-surface"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(148,163,184,0.12)",
            }}
          >
            <motion.div variants={containerVariants} initial="hidden" animate="show">
              {(() => {
                const prof = profile as any;
                return (
                  <>
                    <InfoRow icon="school" label="Institution" value={prof?.institution || prof?.campus} />
                    <InfoRow icon="auto_stories" label="Program" value={prof?.program} />
                    <InfoRow icon="apartment" label="Department" value={prof?.dept || prof?.department} />
                    <InfoRow icon="calendar_month" label="Semester" value={prof?.semester ? `Semester ${prof.semester}` : undefined} />
                    <InfoRow icon="groups" label="Section" value={prof?.section} />
                    <InfoRow icon="badge" label="Batch" value={prof?.batch} />
                    <InfoRow icon="mail" label="Email" value={prof?.email} />
                    <InfoRow icon="id_card" label="Student ID" value={prof?.studentId} />
                    <InfoRow icon="person" label="Faculty Advisor" value={prof?.facultyAdvisor} />
                    <InfoRow icon="person_4" label="Academic Advisor" value={prof?.academicAdvisor} />
                  </>
                );
              })()}
            </motion.div>
          </motion.div>

          {/* Hostel card */}
          {(() => {
            const hostelObj = userData?.hostel?.hostel || userData?.hostel;

            const extractHostelName = (obj: any): string | undefined => {
              if (!obj) return undefined;
              if (obj.hostelName && obj.hostelName !== "null") return obj.hostelName;
              if (obj.name && obj.name !== "null") return obj.name;
              if (obj.hostel && typeof obj.hostel === 'object' && obj.hostel.hostelName) return obj.hostel.hostelName;
              if (obj.block && obj.block !== "null") return obj.block;
              if (obj.hostelBlock && obj.hostelBlock !== "null") return obj.hostelBlock;

              const kvMaps = [obj.booking?.labelValues, obj.details?.labelValues, obj.labelValues].filter(Boolean);
              for (const kv of kvMaps) {
                for (const [k, v] of Object.entries(kv)) {
                  const lower = String(k).toLowerCase();
                  if (
                    (lower.includes('hostel') || lower.includes('block') || lower.includes('hall') || lower.includes('residence')) &&
                    !lower.includes('fee') && !lower.includes('date') && !lower.includes('status') && !lower.includes('room') && v
                  ) {
                    return String(v);
                  }
                }
              }
              return undefined;
            };

            const extractRoomNo = (obj: any): string | undefined => {
              if (!obj) return undefined;
              if (obj.roomNo && obj.roomNo !== "null") return obj.roomNo;
              if (obj.room && obj.room !== "null") return obj.room;
              if (obj.hostel && typeof obj.hostel === 'object' && obj.hostel.roomNo) return obj.hostel.roomNo;

              const kvMaps = [obj.booking?.labelValues, obj.details?.labelValues, obj.labelValues].filter(Boolean);
              for (const kv of kvMaps) {
                for (const [k, v] of Object.entries(kv)) {
                  const lower = String(k).toLowerCase();
                  if ((lower.includes('room') || lower.includes('bed')) && v) {
                    return String(v);
                  }
                }
              }
              return undefined;
            };

            const hostelName = extractHostelName(hostelObj) || extractHostelName(userData?.hostel) || extractHostelName(userData?.profile);
            const roomNo = extractRoomNo(hostelObj) || extractRoomNo(userData?.hostel) || extractRoomNo(userData?.profile);
            const allotmentDate = hostelObj?.allotmentDate || hostelObj?.booking?.labelValues?.["Allotment Date"] || hostelObj?.details?.labelValues?.["Allotment Date"];
            const feeAmount = hostelObj?.feeAmount || hostelObj?.booking?.labelValues?.["Fee Amount"];
            const hostelStatus = userData?.profile?.hostelStatus || userData?.hostelStatus || null;
            const isHosteller = hostelStatus?.toLowerCase()?.includes('hostel') || hostelName || roomNo;

            const hasHostel = hostelName || roomNo || allotmentDate || feeAmount;
            return (
              <motion.div
                variants={itemVariant}
                className="rounded-3xl px-5 aurora-surface"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(148,163,184,0.12)",
                }}
              >
                <motion.div variants={containerVariants} initial="hidden" animate="show">
                  <div className="pt-4 pb-2 border-b border-white/[0.05]">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                      Hostel Accommodation
                    </span>
                  </div>
                  {hasHostel ? (
                    <>
                      {hostelName && <InfoRow icon="home" label="Hostel Name" value={hostelName} />}
                      {roomNo && <InfoRow icon="meeting_room" label="Room Number" value={roomNo} />}
                      {allotmentDate && <InfoRow icon="event" label="Allotment Date" value={allotmentDate} />}
                      {feeAmount && <InfoRow icon="payments" label="Fee Amount" value={feeAmount} />}
                    </>
                  ) : (
                    <InfoRow icon="home" label="Accommodation Status" value={isHosteller ? "Hosteller — details pending" : "Day Scholar / No Active Hostel Allotment"} />
                  )}
                </motion.div>
              </motion.div>
            );
          })()}

          {/* Logout button */}
          <motion.div variants={itemVariant}>
            <button
              onClick={() => { Haptics.selection(); setShowLogoutConfirm(true); }}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 font-black text-[13px] uppercase tracking-widest"
              style={{
                background: "rgba(239,68,68,0.09)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#f87171",
              }}
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              logout
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Logout Confirm Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
              onClick={() => setShowLogoutConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
              className="fixed z-[90] left-5 right-5 bottom-8 max-w-sm mx-auto rounded-3xl p-6 flex flex-col gap-5"
              style={{
                background: "rgba(11,15,30,0.97)",
                border: "1px solid rgba(239,68,68,0.25)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <span className="material-symbols-outlined text-red-400 text-[28px]">logout</span>
                </div>
                <h2 className="text-[18px] font-black text-white">Logout?</h2>
                <p className="text-[13px] text-white/45 leading-relaxed">
                  Your session and locally stored data will be cleared. You&apos;ll need to log in again.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-[13px] text-white/50 transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex-1 py-3.5 rounded-2xl font-black text-[13px] text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                  style={{ background: "rgba(239,68,68,0.85)" }}
                >
                  {loggingOut ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Logout"
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
        attendanceData={userData?.attendance || []}
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
