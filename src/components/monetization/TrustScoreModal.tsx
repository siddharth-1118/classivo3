"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, ShieldCheck, X, Check, PlusCircle, ShoppingBag, ArrowRight, Zap } from "lucide-react";
import { TRUST_SCORE_RULES, getTrustScorePerks, calculateEffectiveMarketplaceFee, SubscriptionTierId } from "@/config/business";
import { Haptics } from "@/utils/shared/haptics";

interface TrustScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  trustScore: number;
  tierId: SubscriptionTierId;
  onUpdateTrustScore?: (delta: number) => void;
  onOpenUpgrade?: () => void;
}

export function TrustScoreModal({
  isOpen,
  onClose,
  trustScore,
  tierId,
  onUpdateTrustScore,
  onOpenUpgrade,
}: TrustScoreModalProps) {
  if (!isOpen) return null;

  const trustInfo = getTrustScorePerks(trustScore);
  const effectiveFee = calculateEffectiveMarketplaceFee(tierId, trustScore);

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
          className="relative w-full max-w-lg rounded-3xl p-6 bg-[#0c0a17] border border-amber-500/25 text-white shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white leading-tight">
                  Campus Trust Score Economy
                </h3>
                <p className="text-xs text-white/50 font-medium">
                  Peer reputation, zero-deposit lending &amp; fee reductions
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

          {/* Scrollable Body */}
          <div className="overflow-y-auto py-5 space-y-5 no-scrollbar flex-1">
            {/* Score Banner */}
            <div className="rounded-2xl p-5 bg-gradient-to-r from-amber-500/15 to-purple-500/15 border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  Current Reputation Level
                </span>
                <h4 className="text-2xl font-black text-white tracking-tight mt-0.5">
                  {trustInfo.currentBadge}
                </h4>
                <p className="text-xs text-white/60 mt-1">
                  Effective Peer Marketplace Fee: <strong className="text-amber-300">{effectiveFee}%</strong>
                </p>
              </div>
              <div className="text-right">
                <span className="text-4xl font-black text-amber-400">{trustScore}</span>
                <span className="text-xs text-white/40 block font-extrabold uppercase">/ 100 PTS</span>
              </div>
            </div>

            {/* Perks Milestones */}
            <div>
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-white/40 mb-3">
                Trust Score Perks &amp; Milestones
              </h4>
              <div className="space-y-2.5">
                {TRUST_SCORE_RULES.PERKS.map((perk, idx) => {
                  const isUnlocked = trustScore >= perk.minScore;
                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl p-3.5 border flex items-center justify-between ${
                        isUnlocked
                          ? "bg-amber-500/10 border-amber-500/30 text-white"
                          : "bg-white/5 border-white/10 text-white/40 opacity-70"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            isUnlocked ? "bg-amber-400 text-black font-black" : "bg-white/10 text-white/40"
                          }`}
                        >
                          {isUnlocked ? <Check className="w-3.5 h-3.5" /> : perk.minScore}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-bold text-white">{perk.title}</h5>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-white/10 text-amber-300">
                              {perk.badgeName}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/60 mt-0.5 leading-tight">{perk.perk}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* How to Earn Trust Points */}
            <div>
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-white/40 mb-3">
                How to Earn &amp; Maintain Trust Points
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: "Verify Student ID", pts: "+20", icon: ShieldCheck },
                  { label: "Completed Peer Lend", pts: "+10", icon: ShoppingBag },
                  { label: "On-time Item Return", pts: "+5", icon: Check },
                  { label: "Resolved Lost & Found", pts: "+15", icon: Zap },
                ].map((act, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
                  >
                    <span className="text-white/70 font-semibold">{act.label}</span>
                    <span className="font-black text-amber-400">{act.pts}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulate Earning Points Action */}
            {onUpdateTrustScore && (
              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-center">
                <p className="text-xs text-white/60 mb-2 font-medium">
                  Test your score progression:
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      Haptics.medium();
                      onUpdateTrustScore(5);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/30"
                  >
                    +5 (Return On Time)
                  </button>
                  <button
                    onClick={() => {
                      Haptics.heavy();
                      onUpdateTrustScore(15);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold hover:bg-purple-500/30"
                  >
                    +15 (Resolve Item)
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
