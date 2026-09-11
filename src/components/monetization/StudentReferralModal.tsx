"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, X, Check, Copy, Share2, MessageCircle, Sparkles, Trophy, Users } from "lucide-react";
import { REFERRAL_PROGRAM } from "@/config/business";
import { Haptics } from "@/utils/shared/haptics";

interface StudentReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode?: string;
  referralCount: number;
  onIncrementReferrals?: () => void;
}

export function StudentReferralModal({
  isOpen,
  onClose,
  referralCode = "CLASSIVO-STUDENT-2026",
  referralCount,
  onIncrementReferrals,
}: StudentReferralModalProps) {
  if (!isOpen) return null;

  const [copied, setCopied] = useState(false);

  const getInviteUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/connections?ref=${referralCode}`;
    }
    return `https://classivo.app/connections?ref=${referralCode}`;
  };

  const handleCopy = () => {
    Haptics.medium();
    const shareUrl = getInviteUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    Haptics.heavy();
    const shareUrl = getInviteUrl();
    const msg = encodeURIComponent(
      `Hey! Join Classivo to access safe bunk predictions, timetable live tracking, and marks simulation at SRMIST. Sign up using my invite code "${referralCode}" or click: ${shareUrl}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener,noreferrer");
  };

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
          className="relative w-full max-w-lg rounded-3xl p-6 bg-[#0c0919] border border-violet-500/25 text-white shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white leading-tight">
                  Student Referral Program
                </h3>
                <p className="text-xs text-white/50 font-medium">
                  Share Classivo &amp; earn free Classivo Pro days
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
            {/* Value Proposition Box */}
            <div className="rounded-2xl p-4 bg-gradient-to-r from-violet-500/15 to-purple-500/15 border border-violet-500/30 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-violet-300">
                Double-Sided Referral Bonus
              </span>
              <h4 className="text-xl font-black text-white mt-1">
                You get <span className="text-cyan-400">7 Days Pro</span> • Friend gets <span className="text-violet-300">3 Days Pro</span>
              </h4>
              <p className="text-xs text-white/60 mt-1 font-medium">
                Every successful signup using your code instantly credits Pro access to both accounts!
              </p>
            </div>

            {/* Referral Link & Share Section */}
            <div>
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-white/40 mb-2 block">
                Your Unique Invite Link &amp; Code
              </label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-2xl">
                <input
                  type="text"
                  readOnly
                  value={getInviteUrl()}
                  className="bg-transparent text-xs font-mono text-violet-300 font-bold px-2 flex-1 outline-none truncate"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 text-xs font-extrabold flex items-center gap-1.5 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={handleShareWhatsApp}
                  className="py-3 rounded-2xl bg-emerald-500 text-black hover:bg-emerald-400 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_16px_rgba(16,185,129,0.3)]"
                >
                  <MessageCircle className="w-4 h-4" /> Share on WhatsApp
                </button>
                <button
                  onClick={handleCopy}
                  className="py-3 rounded-2xl bg-violet-600 text-white hover:bg-violet-500 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_16px_rgba(139,92,246,0.3)]"
                >
                  <Share2 className="w-4 h-4" /> Share Link
                </button>
              </div>
            </div>

            {/* Milestones Tree */}
            <div>
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-white/40 mb-3">
                Referral Reward Milestones
              </h4>
              <div className="space-y-3">
                {REFERRAL_PROGRAM.MILESTONES.map((m, idx) => {
                  const isAchieved = referralCount >= m.requiredReferrals;
                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl p-4 border flex items-center justify-between transition-all ${
                        isAchieved
                          ? "bg-violet-500/15 border-violet-500/40 text-white"
                          : "bg-white/5 border-white/10 text-white/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                            isAchieved
                              ? "bg-violet-500 text-white font-black"
                              : "bg-white/10 text-white/40"
                          }`}
                        >
                          <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-black text-white">{m.rewardTitle}</h5>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-white/10 text-violet-300">
                              {m.requiredReferrals} Invites
                            </span>
                          </div>
                          <p className="text-[11px] text-white/60 mt-0.5 font-medium leading-tight">
                            {m.rewardDescription}
                          </p>
                        </div>
                      </div>
                      <div>
                        {isAchieved ? (
                          <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            UNLOCKED
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-white/40">
                            {m.requiredReferrals - referralCount} Left
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Test Simulation Button */}
            {onIncrementReferrals && (
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-center">
                <p className="text-xs text-white/60 mb-2 font-medium">
                  Test referral milestone progression:
                </p>
                <button
                  onClick={onIncrementReferrals}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-black uppercase tracking-wider hover:bg-cyan-500/30 transition-all"
                >
                  + Simulate 1 Friend Signup
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
