"use client";
import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Crown, ShieldCheck, Zap, ArrowRight, CheckCircle2, Lock } from "lucide-react";
import { SUBSCRIPTION_TIERS, SubscriptionTierId } from "@/config/business";
import { Haptics } from "@/utils/shared/haptics";

interface ClassivoProUpgradeCardProps {
  tierId?: SubscriptionTierId;
  variant?: "card" | "banner" | "compact";
  onOpenUpgrade?: () => void;
  className?: string;
}

export function ClassivoProUpgradeCard({
  tierId = "free",
  variant = "card",
  onOpenUpgrade,
  className = "",
}: ClassivoProUpgradeCardProps) {
  const isPro = tierId === "pro" || tierId === "campus_pass";
  const activeTier = SUBSCRIPTION_TIERS[tierId] || SUBSCRIPTION_TIERS.free;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.heavy();
    if (onOpenUpgrade) onOpenUpgrade();
  };

  if (variant === "banner" || variant === "compact") {
    return (
      <div
        onClick={handleClick}
        className={`rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.99] relative overflow-hidden flex items-center justify-between gap-3 border bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-cyan-500/15 border-amber-500/30 hover:border-amber-500/50 ${className}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-purple-500 text-black flex items-center justify-center font-black shrink-0 shadow-[0_0_16px_rgba(245,158,11,0.4)]">
            <Crown className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-[13px] font-black text-white leading-none">
                {isPro ? activeTier.name : "Upgrade to Classivo Pro"}
              </h4>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-black">
                {isPro ? activeTier.badge : "₹10/MO"}
              </span>
            </div>
            <p className="text-[11px] text-white/50 font-medium mt-1 truncate">
              {isPro
                ? "Attendance Bunk Shield & VIP Peer Privileges Unlocked"
                : "Unlock Bunk Shield alerts, 300 Syncs/hr & 0% Deposit Lending"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase bg-gradient-to-r from-amber-400 to-purple-500 text-black hover:brightness-110 transition-all flex items-center gap-1">
            {isPro ? "Manage" : "Upgrade"} <ArrowRight className="w-3 h-3" />
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
      className={`rounded-3xl p-6 cursor-pointer relative overflow-hidden transition-all duration-300 aurora-surface border bg-gradient-to-br from-amber-500/15 via-purple-500/10 to-cyan-500/10 border-amber-500/30 hover:border-amber-500/50 ${className}`}
    >
      {/* Aurora glow background */}
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl pointer-events-none animate-aurora" />
      <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none animate-aurora" style={{ animationDelay: "-4s" }} />

      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-purple-600 text-black flex items-center justify-center font-black shadow-[0_0_24px_rgba(245,158,11,0.4)]">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white lowercase tracking-tight">
                {isPro ? activeTier.name : "classivo pro"}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-400 text-black">
                {isPro ? activeTier.badge : "SPECIAL OFFERS"}
              </span>
            </div>
            <p className="text-xs text-white/50 font-medium leading-tight mt-0.5">
              {isPro
                ? activeTier.tagline
                : "Supercharge your SRM academic experience & peer network"}
            </p>
          </div>
        </div>

        {!isPro && (
          <div className="text-right">
            <span className="text-2xl font-black text-amber-400 leading-none">₹10</span>
            <span className="text-[10px] text-white/40 font-extrabold uppercase block">/ MONTH</span>
          </div>
        )}
      </div>

      {/* Feature Pills Grid */}
      <div className="grid grid-cols-2 gap-2 my-4 relative z-10">
        {[
          { text: "Attendance Bunk Shield", icon: ShieldCheck },
          { text: "300 Portal Syncs/Hr", icon: Zap },
          { text: "0% Deposit Gear Lending", icon: Crown },
          { text: "Academic PDF Reports", icon: CheckCircle2 },
        ].map((feat, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs font-semibold text-white/80"
          >
            <feat.icon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{feat.text}</span>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between relative z-10">
        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          {isPro ? "Your Subscription is Active" : "Save 33% on Annual Subscription"}
        </span>

        <button className="px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-amber-400 to-purple-500 text-black hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center gap-1.5">
          {isPro ? "View Details" : "Upgrade Now"}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
