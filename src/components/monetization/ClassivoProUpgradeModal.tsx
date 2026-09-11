"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  X,
  Check,
  Zap,
  ShieldCheck,
  Users,
  Package,
  TrendingUp,
  FileText,
  RefreshCw,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  SUBSCRIPTION_TIERS,
  FEATURE_METADATA_LIST,
  SubscriptionTierId,
  calculateYearlySavings,
} from "@/config/business";
import { Haptics } from "@/utils/shared/haptics";

interface ClassivoProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTierId: SubscriptionTierId;
  onUpgradeTier: (tierId: SubscriptionTierId) => void;
}

export function ClassivoProUpgradeModal({
  isOpen,
  onClose,
  currentTierId,
  onUpgradeTier,
}: ClassivoProUpgradeModalProps) {
  if (!isOpen) return null;

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [pendingTier, setPendingTier] = useState<SubscriptionTierId | null>(null);
  const [utrInput, setUtrInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const proSavings = calculateYearlySavings("pro");
  const campusSavings = calculateYearlySavings("campus_pass");

  const [copiedUpi, setCopiedUpi] = useState(false);

  const handleCopyUpi = () => {
    Haptics.medium();
    navigator.clipboard.writeText("9866707883@ybl");
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 3000);
  };

  const handleOpenUpiApp = (tierId: SubscriptionTierId) => {
    const tier = SUBSCRIPTION_TIERS[tierId];
    const price = billingCycle === "yearly" ? tier?.priceYearlyINR : tier?.priceMonthlyINR;
    // Fix: Use registered name Vooka Sai Siddharth to avoid PhonePe payee mismatch decline
    const upiUrl = `upi://pay?pa=9866707883@ybl&pn=Vooka%20Sai%20Siddharth&am=${price}&cu=INR&tn=${encodeURIComponent(`Classivo ${tier.name}`)}`;
    try {
      window.open(upiUrl, "_self");
    } catch (e) {
      console.warn("UPI link error:", e);
    }
  };

  const handleSelectTier = (tierId: SubscriptionTierId) => {
    Haptics.heavy();
    if (tierId === "free") {
      onUpgradeTier("free");
      onClose();
      return;
    }

    // Try auto-opening UPI app with corrected payee name
    handleOpenUpiApp(tierId);
    
    // Move to verification step
    setPendingTier(tierId);
    setVerificationError(null);
    setUtrInput("");
  };

  const handleVerifyPayment = async () => {
    if (!pendingTier) return;
    Haptics.medium();
    setVerifying(true);
    setVerificationError(null);

    const cleanUtr = utrInput.trim();
    if (!cleanUtr || !/^\d{12}$/.test(cleanUtr)) {
      setVerificationError("Please enter the valid 12-digit UPI UTR / Reference number from your PhonePe receipt.");
      setVerifying(false);
      return;
    }

    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utr: cleanUtr,
          tierId: pendingTier,
          amount: billingCycle === "yearly" ? SUBSCRIPTION_TIERS[pendingTier].priceYearlyINR : SUBSCRIPTION_TIERS[pendingTier].priceMonthlyINR,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        Haptics.heavy();
        onUpgradeTier(pendingTier);
        setPendingTier(null);
        onClose();
      } else {
        setVerificationError(data.error || "Payment verification failed. Please check your UTR number.");
      }
    } catch (err) {
      setVerificationError("Network error while verifying payment. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const getFeatureIcon = (iconName: string) => {
    switch (iconName) {
      case "ShieldCheck":
        return <ShieldCheck className="w-4 h-4 text-cyan-400" />;
      case "RefreshCw":
        return <RefreshCw className="w-4 h-4 text-amber-400" />;
      case "Users":
        return <Users className="w-4 h-4 text-violet-400" />;
      case "Package":
        return <Package className="w-4 h-4 text-emerald-400" />;
      case "TrendingUp":
        return <TrendingUp className="w-4 h-4 text-purple-400" />;
      case "FileText":
        return <FileText className="w-4 h-4 text-indigo-400" />;
      default:
        return <Zap className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl rounded-3xl p-6 bg-[#0a0914] border border-amber-500/30 text-white shadow-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col"
        >
          {/* Top Bar / Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-purple-600 text-black flex items-center justify-center font-black shadow-[0_0_16px_rgba(245,158,11,0.4)]">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white leading-tight">
                  {pendingTier ? "Complete PhonePe Payment" : "Classivo Subscription Tiers"}
                </h3>
                <p className="text-xs text-white/50 font-medium">
                  {pendingTier ? "Pay via UPI App, QR Code or UPI ID and paste 12-digit UTR" : "Choose the plan that fits your campus lifestyle"}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                Haptics.light();
                if (pendingTier) setPendingTier(null);
                else onClose();
              }}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {pendingTier ? (
            /* PAYMENT UTR VERIFICATION VIEW */
            <div className="py-5 px-2 space-y-4 flex-1 overflow-y-auto no-scrollbar">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-cyan-500/15 border border-amber-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase text-amber-300">
                    Selected Plan: {SUBSCRIPTION_TIERS[pendingTier]?.name}
                  </span>
                  <span className="text-xs font-black text-amber-400">
                    ₹{billingCycle === "yearly" ? SUBSCRIPTION_TIERS[pendingTier]?.priceYearlyINR : SUBSCRIPTION_TIERS[pendingTier]?.priceMonthlyINR}
                  </span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed font-medium">
                  Pay <strong className="text-amber-300">₹{billingCycle === "yearly" ? SUBSCRIPTION_TIERS[pendingTier]?.priceYearlyINR : SUBSCRIPTION_TIERS[pendingTier]?.priceMonthlyINR}</strong> to VPA <strong className="text-amber-300">9866707883@ybl</strong> (Payee: Vooka Sai Siddharth) using PhonePe, GPay, or Paytm.
                </p>
              </div>

              {/* Action Buttons: Open App & Copy UPI ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleOpenUpiApp(pendingTier)}
                  className="py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 border border-purple-400/30 shadow-lg transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Open PhonePe / UPI App</span>
                </button>
                <button
                  onClick={handleCopyUpi}
                  className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 border border-amber-400/30 transition-all"
                >
                  {copiedUpi ? "✓ Copied: 9866707883@ybl" : "📋 Copy UPI ID: 9866707883@ybl"}
                </button>
              </div>

              {/* QR Code & PhonePe Tip Section */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-center gap-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                    `upi://pay?pa=9866707883@ybl&pn=Vooka%20Sai%20Siddharth&am=${
                      billingCycle === "yearly"
                        ? SUBSCRIPTION_TIERS[pendingTier]?.priceYearlyINR
                        : SUBSCRIPTION_TIERS[pendingTier]?.priceMonthlyINR
                    }&cu=INR&tn=${encodeURIComponent(`Classivo ${SUBSCRIPTION_TIERS[pendingTier]?.name}`)}`
                  )}`}
                  alt="UPI Payment QR Code"
                  className="w-28 h-28 rounded-xl border border-white/20 p-1.5 bg-white shrink-0"
                />
                <div className="text-xs text-white/70 space-y-1.5 leading-relaxed">
                  <p className="font-extrabold text-amber-300">💡 PhonePe Security Tip:</p>
                  <p>
                    If PhonePe says <em className="text-rose-300">"Declined for security reasons"</em> when tapping Open App:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-white/60">
                    <li>Tap <strong className="text-white">Copy UPI ID</strong> (`9866707883@ybl`).</li>
                    <li>Open PhonePe → Search / Pay to UPI ID.</li>
                    <li>Pay ₹{billingCycle === "yearly" ? SUBSCRIPTION_TIERS[pendingTier]?.priceYearlyINR : SUBSCRIPTION_TIERS[pendingTier]?.priceMonthlyINR} &amp; copy 12-digit UTR below.</li>
                  </ol>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-white/50 mb-2 block">
                  12-Digit UPI Reference Number (UTR)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="e.g. 425167891234"
                    value={utrInput}
                    onChange={(e) => setUtrInput(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-white/5 border border-white/15 focus:border-amber-400 px-4 py-3.5 rounded-2xl text-sm font-mono text-amber-300 font-bold tracking-widest outline-none transition-colors"
                  />
                  <span className="absolute right-4 top-3.5 text-xs text-white/30 font-mono">
                    {utrInput.length}/12
                  </span>
                </div>
                {verificationError && (
                  <p className="text-xs text-rose-400 font-bold mt-2 animate-bounce">
                    ⚠️ {verificationError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setPendingTier(null)}
                  className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-white/60 hover:text-white transition-all"
                >
                  Back to Plans
                </button>
                <button
                  onClick={handleVerifyPayment}
                  disabled={verifying || utrInput.length !== 12}
                  className="flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-amber-400 to-purple-500 text-black hover:brightness-110 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                >
                  {verifying ? (
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Verify &amp; Activate Plan <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* TIERS SELECTION VIEW */
            <>

          {/* Billing Cycle Switcher */}
          <div className="flex justify-center my-4 shrink-0">
            <div className="p-1 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-1">
              <button
                onClick={() => {
                  Haptics.light();
                  setBillingCycle("monthly");
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  billingCycle === "monthly"
                    ? "bg-white/15 text-white shadow-md"
                    : "text-white/40 hover:text-white"
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => {
                  Haptics.light();
                  setBillingCycle("yearly");
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  billingCycle === "yearly"
                    ? "bg-gradient-to-r from-amber-400 to-purple-500 text-black shadow-md"
                    : "text-white/40 hover:text-white"
                }`}
              >
                Yearly Pass
                <span className="px-1.5 py-0.2 text-[9px] bg-black/30 text-amber-200 rounded-full font-black">
                  Save 33%
                </span>
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto space-y-6 no-scrollbar flex-1 pr-1">
            {/* Tiers Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* FREE TIER */}
              <div
                className={`rounded-2xl p-4 border flex flex-col justify-between transition-all ${
                  currentTierId === "free"
                    ? "bg-white/10 border-white/30"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black uppercase text-white/50">Classivo Free</span>
                    {currentTierId === "free" && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-black bg-white/20 text-white">
                        CURRENT
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-white mb-2">
                    ₹0 <span className="text-xs font-medium text-white/40">/ forever</span>
                  </div>
                  <p className="text-[11px] text-white/50 mb-4 leading-relaxed">
                    Standard schedule viewing and manual attendance logging.
                  </p>
                </div>

                <button
                  disabled={currentTierId === "free"}
                  onClick={() => handleSelectTier("free")}
                  className="w-full py-2.5 rounded-xl font-bold text-xs border border-white/20 text-white/70 hover:bg-white/10 disabled:opacity-40 transition-all"
                >
                  {currentTierId === "free" ? "Active Plan" : "Switch to Free"}
                </button>
              </div>

              {/* PRO TIER */}
              <div
                className={`rounded-2xl p-4 border relative overflow-hidden flex flex-col justify-between transition-all ${
                  currentTierId === "pro"
                    ? "bg-gradient-to-b from-amber-500/20 to-purple-500/10 border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.2)]"
                    : "bg-gradient-to-b from-amber-500/10 to-purple-500/5 border-amber-500/30 hover:border-amber-500/60"
                }`}
              >
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-400 to-purple-500 text-black text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl">
                  POPULAR
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black uppercase text-amber-300">Classivo Pro</span>
                    {currentTierId === "pro" && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-400 text-black">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <div className="text-2xl font-black text-amber-400 mb-1">
                    {billingCycle === "yearly" ? `₹${SUBSCRIPTION_TIERS.pro.priceYearlyINR}` : `₹${SUBSCRIPTION_TIERS.pro.priceMonthlyINR}`}
                    <span className="text-xs font-medium text-white/40">
                      {billingCycle === "yearly" ? " / yr" : " / mo"}
                    </span>
                  </div>

                  {billingCycle === "yearly" && (
                    <p className="text-[10px] font-bold text-emerald-400 mb-2">
                      Save ₹{proSavings.savingsINR} yearly ({proSavings.savingsPct}% OFF)
                    </p>
                  )}

                  <p className="text-[11px] text-white/60 mb-4 leading-relaxed">
                    Attendance Bunk Shield, 60 Syncs/hr, 50% Gear Deposit Discount &amp; Pro Badge.
                  </p>
                </div>

                <button
                  onClick={() => handleSelectTier("pro")}
                  className="w-full py-2.5 rounded-xl font-black text-xs uppercase bg-gradient-to-r from-amber-400 to-purple-500 text-black hover:brightness-110 active:scale-95 transition-all shadow-[0_0_16px_rgba(245,158,11,0.3)]"
                >
                  {currentTierId === "pro" ? "Active Plan" : "Upgrade to Pro"}
                </button>
              </div>

              {/* CAMPUS PASS TIER */}
              <div
                className={`rounded-2xl p-4 border relative overflow-hidden flex flex-col justify-between transition-all ${
                  currentTierId === "campus_pass"
                    ? "bg-gradient-to-b from-cyan-500/20 to-indigo-500/10 border-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.2)]"
                    : "bg-gradient-to-b from-cyan-500/10 to-indigo-500/5 border-cyan-500/30 hover:border-cyan-500/60"
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black uppercase text-cyan-300">Campus Pass VIP</span>
                    {currentTierId === "campus_pass" && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-black bg-cyan-400 text-black">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <div className="text-2xl font-black text-cyan-400 mb-1">
                    {billingCycle === "yearly" ? `₹${SUBSCRIPTION_TIERS.campus_pass.priceYearlyINR}` : `₹${SUBSCRIPTION_TIERS.campus_pass.priceMonthlyINR}`}
                    <span className="text-xs font-medium text-white/40">
                      {billingCycle === "yearly" ? " / yr" : " / mo"}
                    </span>
                  </div>

                  {billingCycle === "yearly" && (
                    <p className="text-[10px] font-bold text-emerald-400 mb-2">
                      Save ₹{campusSavings.savingsINR} yearly ({campusSavings.savingsPct}% OFF)
                    </p>
                  )}

                  <p className="text-[11px] text-white/60 mb-4 leading-relaxed">
                    300 Syncs/hr, 0% Security Deposit on gear lending, 0% Marketplace Fee.
                  </p>
                </div>

                <button
                  onClick={() => handleSelectTier("campus_pass")}
                  className="w-full py-2.5 rounded-xl font-black text-xs uppercase bg-gradient-to-r from-cyan-400 to-indigo-500 text-black hover:brightness-110 active:scale-95 transition-all shadow-[0_0_16px_rgba(34,211,238,0.3)]"
                >
                  {currentTierId === "campus_pass" ? "Active Plan" : "Get Campus Pass"}
                </button>
              </div>
            </div>

            {/* Feature Metadata List */}
            <div>
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-white/40 mb-3">
                All Included Premium Features
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {FEATURE_METADATA_LIST.map((feat) => (
                  <div
                    key={feat.id}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3"
                  >
                    <div className="p-2 rounded-xl bg-white/10 border border-white/10 shrink-0 mt-0.5">
                      {getFeatureIcon(feat.iconName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-bold text-white">{feat.title}</h5>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-white/10 text-cyan-300">
                          {feat.availableInTier === "free" ? "FREE" : feat.availableInTier === "pro" ? "PRO" : "VIP"}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
                        {feat.shortDescription}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
