import { useState, useEffect, useCallback } from "react";
import {
  SubscriptionTierId,
  SUBSCRIPTION_TIERS,
  getTrustScorePerks,
  calculateEffectiveMarketplaceFee,
  calculateBunkShieldMargin,
  REFERRAL_PROGRAM,
} from "@/config/business";
import { Haptics } from "@/utils/shared/haptics";
import { supabase } from "@/lib/supabase";

export function useMonetization() {
  const [tierId, setTierId] = useState<SubscriptionTierId>("free");
  const [trustScore, setTrustScore] = useState<number>(85);
  const [referralCount, setReferralCount] = useState<number>(8);
  const [targetBunkPct, setTargetBunkPct] = useState<number>(75);

  // Modals
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [isBunkShieldModalOpen, setIsBunkShieldModalOpen] = useState(false);
  const [isTrustModalOpen, setIsTrustModalOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);

  // Fetch initial monetization data from Supabase & fallback to LocalStorage
  useEffect(() => {
    let isMounted = true;
    const fetchFromSupabase = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;

        if (userId) {
          const { data, error } = await supabase
            .from("user_settings")
            .select("tier_id, trust_score, referral_count, target_bunk_pct")
            .eq("user_id", userId)
            .single();

          if (data && isMounted) {
            if (data.tier_id) setTierId(data.tier_id as SubscriptionTierId);
            if (data.trust_score !== undefined) setTrustScore(data.trust_score);
            if (data.referral_count !== undefined) setReferralCount(data.referral_count);
            if (data.target_bunk_pct !== undefined) setTargetBunkPct(data.target_bunk_pct);
            return;
          }
        }
      } catch (e) {
        console.warn("Supabase monetization sync fallback to local storage:", e);
      }

      if (typeof window !== "undefined" && isMounted) {
        const savedTier = localStorage.getItem("classivo_user_tier") as SubscriptionTierId;
        if (savedTier && SUBSCRIPTION_TIERS[savedTier]) {
          setTierId(savedTier);
        }
        const savedTrust = localStorage.getItem("classivo_trust_score");
        if (savedTrust) {
          setTrustScore(parseInt(savedTrust, 10));
        }
        const savedRef = localStorage.getItem("classivo_referral_count");
        if (savedRef) {
          setReferralCount(parseInt(savedRef, 10));
        }
        const savedTarget = localStorage.getItem("classivo_target_bunk_pct");
        if (savedTarget) {
          setTargetBunkPct(parseInt(savedTarget, 10));
        }
      }
    };

    fetchFromSupabase();
    return () => { isMounted = false; };
  }, []);

  const syncToSupabase = useCallback(async (updates: Record<string, any>) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (userId) {
        await supabase
          .from("user_settings")
          .upsert({ user_id: userId, ...updates, updated_at: new Date().toISOString() });
      }
    } catch (e) {
      console.warn("Supabase upsert failed silently:", e);
    }
  }, []);

  const upgradeTier = useCallback((newTier: SubscriptionTierId) => {
    Haptics.heavy();
    setTierId(newTier);
    if (typeof window !== "undefined") {
      localStorage.setItem("classivo_user_tier", newTier);
    }
    syncToSupabase({ tier_id: newTier });
  }, [syncToSupabase]);

  const updateTrustScore = useCallback((delta: number) => {
    setTrustScore((prev) => {
      const next = Math.min(100, Math.max(0, prev + delta));
      if (typeof window !== "undefined") {
        localStorage.setItem("classivo_trust_score", String(next));
      }
      syncToSupabase({ trust_score: next });
      return next;
    });
  }, [syncToSupabase]);

  const incrementReferrals = useCallback(() => {
    Haptics.medium();
    setReferralCount((prev) => {
      const next = prev + 1;
      if (typeof window !== "undefined") {
        localStorage.setItem("classivo_referral_count", String(next));
      }
      syncToSupabase({ referral_count: next });
      return next;
    });
  }, [syncToSupabase]);

  const changeTargetBunkPct = useCallback((pct: number) => {
    Haptics.light();
    setTargetBunkPct(pct);
    if (typeof window !== "undefined") {
      localStorage.setItem("classivo_target_bunk_pct", String(pct));
    }
    syncToSupabase({ target_bunk_pct: pct });
  }, [syncToSupabase]);

  const currentTier = SUBSCRIPTION_TIERS[tierId] || SUBSCRIPTION_TIERS.free;
  const trustInfo = getTrustScorePerks(trustScore);
  const effectiveFee = calculateEffectiveMarketplaceFee(tierId, trustScore);

  return {
    tierId,
    currentTier,
    upgradeTier,
    trustScore,
    trustInfo,
    updateTrustScore,
    effectiveFee,
    referralCount,
    incrementReferrals,
    targetBunkPct,
    changeTargetBunkPct,

    // Modal Controls
    isProModalOpen,
    setIsProModalOpen,
    openProModal: () => { Haptics.selection(); setIsProModalOpen(true); },
    closeProModal: () => setIsProModalOpen(false),

    isBunkShieldModalOpen,
    setIsBunkShieldModalOpen,
    openBunkShieldModal: () => { Haptics.selection(); setIsBunkShieldModalOpen(true); },
    closeBunkShieldModal: () => setIsBunkShieldModalOpen(false),

    isTrustModalOpen,
    setIsTrustModalOpen,
    openTrustModal: () => { Haptics.selection(); setIsTrustModalOpen(true); },
    closeTrustModal: () => setIsTrustModalOpen(false),

    isReferralModalOpen,
    setIsReferralModalOpen,
    openReferralModal: () => { Haptics.selection(); setIsReferralModalOpen(true); },
    closeReferralModal: () => setIsReferralModalOpen(false),
  };
}
