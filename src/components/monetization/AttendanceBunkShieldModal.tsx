"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ShieldAlert, X, Zap, CheckCircle2, Lock, ArrowRight } from "lucide-react";
import { calculateBunkShieldMargin, SubscriptionTierId } from "@/config/business";
import { AttendanceRecord } from "@/types";
import { Haptics } from "@/utils/shared/haptics";

interface AttendanceBunkShieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendanceData?: AttendanceRecord[];
  targetThresholdPct: number;
  onSelectTargetPct: (pct: number) => void;
  tierId: SubscriptionTierId;
  onOpenUpgrade: () => void;
}

export function AttendanceBunkShieldModal({
  isOpen,
  onClose,
  attendanceData = [],
  targetThresholdPct,
  onSelectTargetPct,
  tierId,
  onOpenUpgrade,
}: AttendanceBunkShieldModalProps) {
  if (!isOpen) return null;

  const isPro = tierId === "pro" || tierId === "campus_pass";

  // Calculate overall metrics
  let totalConducted = 0;
  let totalPresent = 0;

  attendanceData.forEach((record) => {
    totalConducted += record.conducted || 0;
    totalPresent += record.present || 0;
  });

  const overallMargin = calculateBunkShieldMargin(totalPresent, totalConducted, targetThresholdPct);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg rounded-3xl p-6 bg-[#090b14] border border-cyan-500/20 text-white shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white leading-tight">
                  Attendance Bunk Shield
                </h3>
                <p className="text-xs text-white/50 font-medium">
                  Real-time safe margin &amp; threshold calculator
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                Haptics.light();
                onClose();
              }}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto py-5 space-y-5 no-scrollbar flex-1">
            {/* Target Selector */}
            <div>
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-white/40 mb-2 block">
                Target Safety Floor Threshold
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[75, 80, 85, 90].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => onSelectTargetPct(pct)}
                    className={`py-2.5 rounded-2xl font-black text-xs transition-all border ${
                      targetThresholdPct === pct
                        ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.4)]"
                        : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Overall Summary Card */}
            <div
              className={`rounded-2xl p-4 border ${
                overallMargin.isSafe
                  ? "bg-emerald-500/10 border-emerald-500/25"
                  : "bg-rose-500/10 border-rose-500/25"
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-white/70">Overall Safety Margin</span>
                <span
                  className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    overallMargin.isSafe ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {overallMargin.isSafe ? "Safe Capacity" : "Action Required"}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-3xl font-black ${
                    overallMargin.isSafe ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {overallMargin.isSafe ? overallMargin.safeBunksRemaining : `-${overallMargin.classesNeededToRecover}`}
                </span>
                <span className="text-sm font-semibold text-white/60">
                  {overallMargin.isSafe ? "Lectures you can missing" : "Classes needed to reach target"}
                </span>
              </div>
              <p className="text-xs text-white/60 font-medium mt-2 leading-relaxed">
                {overallMargin.statusMessage}
              </p>
            </div>

            {/* Per-Subject Bunk Margin Breakdown */}
            <div>
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-white/40 mb-2">
                Per-Subject Safe Capacity Breakdown
              </h4>
              {attendanceData.length === 0 ? (
                <p className="text-xs text-white/40 italic py-2">No attendance records loaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {attendanceData.map((course, idx) => {
                    const marginSub = calculateBunkShieldMargin(
                      course.present || 0,
                      course.conducted || 0,
                      targetThresholdPct
                    );
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl p-3.5 bg-white/5 border border-white/10 flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-3">
                          <h5 className="text-xs font-bold text-white truncate">
                            {course.course || course.code}
                          </h5>
                          <p className="text-[10px] text-white/40 mt-0.5">
                            Attended: {course.present}/{course.conducted} ({course.percent}%)
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`text-sm font-black ${
                              marginSub.isSafe ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {marginSub.isSafe ? `${marginSub.safeBunksRemaining} Bunks` : `Need ${marginSub.classesNeededToRecover}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bunk Shield Features / Pro Teaser */}
            <div className="rounded-2xl p-4 bg-cyan-950/20 border border-cyan-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <h5 className="text-xs font-black uppercase text-cyan-300">
                  How Bunk Shield Protects You
                </h5>
              </div>
              <ul className="space-y-2 text-xs text-white/70">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Calculates lecture limits dynamically based on credit weights.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Monitors medical leave reserves and officially approved absences.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Sends instant push notifications when safety buffer falls under 2 lectures.</span>
                </li>
              </ul>

              {!isPro && (
                <button
                  onClick={() => {
                    Haptics.heavy();
                    onClose();
                    onOpenUpgrade();
                  }}
                  className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                >
                  <Lock className="w-3.5 h-3.5" /> Upgrade to Classivo Pro for Auto Alerts
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
