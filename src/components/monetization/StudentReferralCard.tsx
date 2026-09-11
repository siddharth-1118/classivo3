"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Gift, Copy, Check, MessageCircle } from "lucide-react";
import { REFERRAL_PROGRAM } from "@/config/business";
import { Haptics } from "@/utils/shared/haptics";

interface StudentReferralCardProps {
  referralCode?: string;
  referralCount?: number;
  variant?: "card" | "banner" | "compact";
  onOpenModal?: () => void;
  onIncrementReferral?: () => void;
  className?: string;
}

export function StudentReferralCard({
  referralCode = "CLASSIVO-STUDENT-2026",
  referralCount = 2,
  variant = "card",
  onOpenModal,
  onIncrementReferral,
  className = "",
}: StudentReferralCardProps) {
  const [copied, setCopied] = useState(false);

  const nextMilestone = REFERRAL_PROGRAM.MILESTONES.find(
    (m) => referralCount < m.requiredReferrals
  ) || REFERRAL_PROGRAM.MILESTONES[REFERRAL_PROGRAM.MILESTONES.length - 1];

  const getInviteUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/connections?ref=${referralCode}`;
    }
    return `https://classivo.app/connections?ref=${referralCode}`;
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.medium();
    const shareUrl = getInviteUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.heavy();
    const shareUrl = getInviteUrl();
    const msg = encodeURIComponent(
      `Hey! Use Classivo to track your attendance, safe bunks, internal marks, and timetable at SRMIST. Sign up with my invite link to get free Classivo Pro days: ${shareUrl}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.selection();
    if (onOpenModal) onOpenModal();
  };

  if (variant === "banner" || variant === "compact") {
    return (
      <div
        onClick={handleClick}
        className={`rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.99] relative overflow-hidden flex items-center justify-between gap-3 border bg-gradient-to-r from-violet-950/30 via-indigo-950/20 to-purple-950/30 border-violet-500/30 hover:border-violet-500/50 ${className}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[13px] font-black text-white leading-none">
              Invite Classmates, Earn Free Pro
            </h4>
            <p className="text-[11px] text-white/50 font-medium mt-1 truncate">
              {referralCount} Invites Done • Next: {nextMilestone.rewardTitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleShareWhatsApp}
            className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-emerald-500 text-black hover:bg-emerald-400 transition-all flex items-center gap-1"
          >
            <MessageCircle className="w-3 h-3" /> Share
          </button>
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
      className={`rounded-2xl p-3.5 cursor-pointer relative overflow-hidden transition-all duration-300 border bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border-violet-500/25 hover:border-violet-500/40 backdrop-blur-xl flex flex-col justify-between ${className}`}
    >
      {/* Background Glow */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-violet-500/15 rounded-full blur-2xl pointer-events-none" />

      <div>
        {/* Header: Title + Count */}
        <div className="flex items-center justify-between gap-1.5 relative z-10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
              <Gift className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[12px] font-black text-white leading-tight truncate">
                Student Referrals
              </h4>
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider truncate">
                7 Days Free Pro / Peer
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[20px] font-black text-violet-300 leading-none tracking-tight">
              {referralCount}
            </span>
            <span className="text-[8px] text-white/40 font-bold block uppercase">
              Invites
            </span>
          </div>
        </div>

        {/* Badge Row */}
        <div className="mt-2 flex items-center gap-1.5 relative z-10">
          <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-violet-400/20 text-violet-300 border border-violet-400/30 shrink-0">
            VIRAL LOOP
          </span>
          <span className="text-[9px] text-violet-200/70 font-semibold truncate">
            {referralCount}/{nextMilestone.requiredReferrals} ({nextMilestone.rewardTitle})
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative z-10 mt-3">
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden border border-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 shadow-[0_0_10px_rgba(139,92,246,0.5)] transition-all duration-700"
            style={{
              width: `${Math.min(
                100,
                (referralCount / nextMilestone.requiredReferrals) * 100
              )}%`,
            }}
          />
        </div>
      </div>

      {/* Invite Code & Compact Action Buttons */}
      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-1.5 relative z-10">
        <div className="bg-white/5 border border-white/10 px-2 py-1 rounded-lg min-w-0 flex-1">
          <p className="text-[9.5px] font-mono font-bold text-violet-300 truncate">
            {referralCode}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className="px-2 py-1 rounded-lg bg-white/10 text-white hover:bg-white/20 border border-white/10 text-[9.5px] font-extrabold flex items-center gap-1 transition-all"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="px-2 py-1 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 text-[9.5px] font-black flex items-center gap-1 transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)]"
          >
            <MessageCircle className="w-3 h-3" />
            <span>WA</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
