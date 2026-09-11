"use client";
import React from "react";
import { motion } from "framer-motion";
import { Award, Sparkles, ChevronRight } from "lucide-react";
import { getTrustScorePerks, calculateEffectiveMarketplaceFee, SubscriptionTierId } from "@/config/business";
import { Haptics } from "@/utils/shared/haptics";

interface TrustScoreStatusPillProps {
  score?: number;
  tierId?: SubscriptionTierId;
  variant?: "pill" | "card" | "compact";
  onOpenModal?: () => void;
  className?: string;
}

export function TrustScoreStatusPill({
  score = 85,
  tierId = "free",
  variant = "card",
  onOpenModal,
  className = "",
}: TrustScoreStatusPillProps) {
  const trustInfo = getTrustScorePerks(score);
  const effectiveFee = calculateEffectiveMarketplaceFee(tierId, score);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.selection();
    if (onOpenModal) onOpenModal();
  };

  if (variant === "pill" || variant === "compact") {
    return (
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide transition-all active:scale-95 bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 ${className}`}
      >
        <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>Trust Score: {score}/100</span>
        <span className="bg-amber-400 text-black text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full shrink-0 whitespace-nowrap">
          {trustInfo.currentBadge}
        </span>
      </button>
    );
  }

  // Default: "card"
  return (
    <motion.div
      onClick={handleClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`rounded-2xl p-3.5 cursor-pointer relative overflow-hidden transition-all duration-300 border bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-transparent border-amber-500/25 hover:border-amber-500/40 backdrop-blur-xl flex flex-col justify-between ${className}`}
    >
      {/* Background Glow */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

      <div>
        {/* Header: Title + Points */}
        <div className="flex items-center justify-between gap-1.5 relative z-10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[12px] font-black text-white leading-tight truncate">
                Trust Score
              </h4>
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider truncate">
                Peer Reputation
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[20px] font-black text-amber-400 leading-none tracking-tight">
              {score}
            </span>
            <span className="text-[8px] text-white/40 font-bold block uppercase">
              / 100 PTS
            </span>
          </div>
        </div>

        {/* Badge Row */}
        <div className="mt-2 flex items-center gap-1.5 relative z-10">
          <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 shrink-0">
            {trustInfo.currentBadge}
          </span>
          <span className="text-[9px] text-amber-200/70 font-semibold truncate">
            Fee: {effectiveFee}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative z-10 mt-3">
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden border border-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-purple-400 shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-700"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Perks Footer */}
      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-medium text-white/70 relative z-10 gap-1">
        <span className="flex items-center gap-1 text-amber-300 font-bold truncate">
          <Sparkles className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {trustInfo.perks.length > 0 ? trustInfo.perks[trustInfo.perks.length - 1].perk : "Zero Deposit Perks"}
          </span>
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-white/40 shrink-0" />
      </div>
    </motion.div>
  );
}
