"use client";
import React from "react";
import { motion } from "framer-motion";
import { Shield, ShieldAlert, ShieldCheck, Zap, Lock, ChevronRight } from "lucide-react";
import { calculateBunkShieldMargin, SubscriptionTierId } from "@/config/business";
import { Haptics } from "@/utils/shared/haptics";

interface AttendanceBunkShieldBadgeProps {
  attendedClasses: number;
  totalClasses: number;
  targetThresholdPct?: number;
  tierId?: SubscriptionTierId;
  variant?: "pill" | "card" | "banner";
  onOpenModal?: () => void;
  onOpenUpgrade?: () => void;
  className?: string;
}

export function AttendanceBunkShieldBadge({
  attendedClasses,
  totalClasses,
  targetThresholdPct = 75,
  tierId = "free",
  variant = "card",
  onOpenModal,
  onOpenUpgrade,
  className = "",
}: AttendanceBunkShieldBadgeProps) {
  const margin = calculateBunkShieldMargin(attendedClasses, totalClasses, targetThresholdPct);
  const isPro = tierId === "pro" || tierId === "campus_pass";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.selection();
    if (onOpenModal) onOpenModal();
  };

  if (variant === "pill") {
    return (
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide transition-all active:scale-95 ${
          margin.isSafe
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20"
            : "bg-rose-500/10 text-rose-400 border border-rose-500/25 hover:bg-rose-500/20"
        } ${className}`}
      >
        {margin.isSafe ? (
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        ) : (
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        )}
        <span>
          {margin.isSafe
            ? `${margin.safeBunksRemaining} Safe Bunk${margin.safeBunksRemaining !== 1 ? "s" : ""}`
            : `Attend ${margin.classesNeededToRecover} Class${margin.classesNeededToRecover !== 1 ? "es" : ""}`}
        </span>
        {isPro && (
          <span className="bg-cyan-400 text-black text-[9px] font-black uppercase px-1 rounded">
            PRO
          </span>
        )}
      </button>
    );
  }

  if (variant === "banner") {
    return (
      <div
        onClick={handleClick}
        className={`rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.99] relative overflow-hidden flex items-center justify-between gap-4 border ${
          margin.isSafe
            ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50"
            : "bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50"
        } ${className}`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              margin.isSafe
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/15 border-rose-500/30 text-rose-400"
            }`}
          >
            {margin.isSafe ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-[13px] font-black text-white leading-none">
                Attendance Bunk Shield
              </h4>
              <span
                className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  margin.isSafe ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                }`}
              >
                {targetThresholdPct}% Target
              </span>
            </div>
            <p className="text-[11px] text-white/50 font-medium mt-1 truncate">
              {margin.statusMessage}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ChevronRight className="w-4 h-4 text-white/40" />
        </div>
      </div>
    );
  }

  // Default: "card"
  return (
    <motion.div
      onClick={handleClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`rounded-3xl p-5 cursor-pointer relative overflow-hidden transition-all duration-300 aurora-surface border ${
        margin.isSafe
          ? "bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-transparent border-emerald-500/25 hover:border-emerald-500/40"
          : "bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-transparent border-rose-500/25 hover:border-rose-500/40"
      } ${className}`}
    >
      {/* Background glow */}
      <div
        className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl pointer-events-none ${
          margin.isSafe ? "bg-emerald-500/15" : "bg-rose-500/15"
        }`}
      />

      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${
              margin.isSafe
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/15 border-rose-500/30 text-rose-400"
            }`}
          >
            {margin.isSafe ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-black text-white tracking-tight lowercase">
                bunk shield
              </span>
              {isPro ? (
                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                  ACTIVE
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> FREE
                </span>
              )}
            </div>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
              {targetThresholdPct}% Safety Floor
            </p>
          </div>
        </div>

        <div className="text-right">
          <span
            className={`text-[26px] font-black leading-none tracking-tight ${
              margin.isSafe ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {margin.isSafe ? margin.safeBunksRemaining : `-${margin.classesNeededToRecover}`}
          </span>
          <span className="text-[10px] text-white/40 font-bold block uppercase tracking-wider">
            {margin.isSafe ? "bunks available" : "classes needed"}
          </span>
        </div>
      </div>

      {/* Margin indicator bar */}
      <div className="relative z-10 mt-2">
        <div className="flex justify-between items-center text-[10px] font-bold mb-1">
          <span className="text-white/50">Current: {margin.currentPct}%</span>
          <span className="text-white/40">Threshold: {targetThresholdPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              margin.isSafe
                ? "bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                : "bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.5)]"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, margin.currentPct))}%` }}
          />
        </div>
      </div>

      <p className="text-[11px] text-white/60 font-medium mt-3 leading-tight relative z-10">
        {margin.statusMessage}
      </p>

      {!isPro && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenUpgrade) onOpenUpgrade();
          }}
          className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Unlock automated instant push alerts on Classivo Pro
          </span>
          <ChevronRight className="w-4 h-4" />
        </div>
      )}
    </motion.div>
  );
}
