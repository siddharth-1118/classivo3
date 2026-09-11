/**
 * Classivo Business Strategy, Premium Tier Entitlements & Monetization Architecture
 * Enterprise Growth, Trust Economy, Referral Growth Loops & Monetization Configuration
 */

// ==========================================
// 1. SUBSCRIPTION TIERS & ENTITLEMENTS
// ==========================================

export type SubscriptionTierId = "free" | "pro" | "campus_pass";

export interface TierFeatures {
  /** Maximum automated portal refreshes allowed per hour */
  portalRefreshLimitPerHour: number;
  /** Safe-bunk calculation engine with timetable integration & alert triggers */
  attendanceBunkShield: boolean;
  /** What-if GPA prediction, credit-weighted simulator & mark forecasting */
  aiGpaPredictor: boolean;
  /** Top-tier ranking in ProjectMate team matching & peer skill searches */
  priorityPeerMatchmaking: boolean;
  /** Percentage discount on security deposit requirements for peer gear lending */
  gearLendingDepositDiscountPct: number;
  /** Ability to export detailed academic & attendance analytics to PDF */
  exportPdfReports: boolean;
  /** Real-time push notifications for attendance drops & timetable shifts */
  pushNotificationsInstant: boolean;
  /** Custom app color themes and UI personalization options */
  customThemes: boolean;
  /** Complete removal of sponsored campus deals & banner placements */
  adFreeExperience: boolean;
  /** Advanced academic trend visualizer & peer benchmark analytics */
  advancedAnalytics: boolean;
  /** Reduction percentage on peer-to-peer marketplace transaction fees */
  peerMarketplaceFeeReductionPct: number;
}

export interface SubscriptionTier {
  id: SubscriptionTierId;
  name: string;
  badge: string;
  tagline: string;
  priceMonthlyINR: number;
  priceYearlyINR: number;
  currency: string;
  popular?: boolean;
  features: TierFeatures;
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTierId, SubscriptionTier> = {
  free: {
    id: "free",
    name: "Classivo Free",
    badge: "Basic",
    tagline: "Essential student companion for daily schedule and attendance tracking",
    priceMonthlyINR: 0,
    priceYearlyINR: 0,
    currency: "INR",
    features: {
      portalRefreshLimitPerHour: 4,
      attendanceBunkShield: false,
      aiGpaPredictor: true,
      priorityPeerMatchmaking: false,
      gearLendingDepositDiscountPct: 0,
      exportPdfReports: false,
      pushNotificationsInstant: false,
      customThemes: false,
      adFreeExperience: false,
      advancedAnalytics: false,
      peerMarketplaceFeeReductionPct: 0,
    },
  },
  pro: {
    id: "pro",
    name: "Classivo Pro",
    badge: "PRO",
    tagline: "Unlimited portal sync, AI bunk margin predictions, and priority campus network access",
    priceMonthlyINR: 10,
    priceYearlyINR: 99,
    currency: "INR",
    popular: true,
    features: {
      portalRefreshLimitPerHour: 60,
      attendanceBunkShield: true,
      aiGpaPredictor: true,
      priorityPeerMatchmaking: true,
      gearLendingDepositDiscountPct: 50,
      exportPdfReports: true,
      pushNotificationsInstant: true,
      customThemes: true,
      adFreeExperience: true,
      advancedAnalytics: true,
      peerMarketplaceFeeReductionPct: 50,
    },
  },
  campus_pass: {
    id: "campus_pass",
    name: "Classivo Campus Pass",
    badge: "VIP / Student Pass",
    tagline: "All-inclusive tier with instant portal refresh, zero deposit gear lending, and elite status",
    priceMonthlyINR: 15,
    priceYearlyINR: 149,
    currency: "INR",
    features: {
      portalRefreshLimitPerHour: 300,
      attendanceBunkShield: true,
      aiGpaPredictor: true,
      priorityPeerMatchmaking: true,
      gearLendingDepositDiscountPct: 100,
      exportPdfReports: true,
      pushNotificationsInstant: true,
      customThemes: true,
      adFreeExperience: true,
      advancedAnalytics: true,
      peerMarketplaceFeeReductionPct: 100,
    },
  },
};

// ==========================================
// 2. FEATURE METADATA & HIGHLIGHTS
// ==========================================

export interface PremiumFeatureMetadata {
  id: keyof TierFeatures;
  title: string;
  shortDescription: string;
  detailedDescription: string;
  category: "academic" | "peer_network" | "productivity";
  iconName: string;
  availableInTier: SubscriptionTierId;
}

export const FEATURE_METADATA_LIST: PremiumFeatureMetadata[] = [
  {
    id: "attendanceBunkShield",
    title: "Attendance Bunk Shield",
    shortDescription: "Calculate exact safe bunk capacity without crossing 75% attendance threshold",
    detailedDescription:
      "Automated real-time safety margin calculator that factors in scheduled lectures, official holidays, medical leave reserves, and target thresholds (75% / 80% / 85%). Sends proactive alerts when your safety buffer drops below 2 lectures.",
    category: "academic",
    iconName: "ShieldCheck",
    availableInTier: "pro",
  },
  {
    id: "portalRefreshLimitPerHour",
    title: "Unlimited Portal Refresh",
    shortDescription: "High-frequency automatic portal synchronization with instant push updates",
    detailedDescription:
      "Bypass standard 4-per-hour sync caps. Sync attendance, marks, and timetable updates up to 300 times per hour with zero rate-limit wait times and automated captcha bypass.",
    category: "academic",
    iconName: "RefreshCw",
    availableInTier: "pro",
  },
  {
    id: "priorityPeerMatchmaking",
    title: "Priority Peer Matchmaking",
    shortDescription: "Top placement in ProjectMate collaborator lists & peer study groups",
    detailedDescription:
      "Boost your visibility to top-ranking peers looking for hackathon partners, course study groups, or project collaborators. Pro profiles receive 3x higher match priority.",
    category: "peer_network",
    iconName: "Users",
    availableInTier: "pro",
  },
  {
    id: "gearLendingDepositDiscountPct",
    title: "Zero Deposit Gear Lending",
    shortDescription: "Waived or discounted security deposits on lab gear & gadgets",
    detailedDescription:
      "Verified Pro and Campus Pass users enjoy up to 100% security deposit waiver when renting laptops, lab gear, cameras, and textbooks from campus peers.",
    category: "peer_network",
    iconName: "Package",
    availableInTier: "campus_pass",
  },
  {
    id: "aiGpaPredictor",
    title: "AI GPA Predictor",
    shortDescription: "Simulate exam targets and credit-weighted end-term results",
    detailedDescription:
      "Machine learning models project your target internal marks required to score O/A+ grades based on past semester grade distributions and course weightings.",
    category: "academic",
    iconName: "TrendingUp",
    availableInTier: "free",
  },
  {
    id: "exportPdfReports",
    title: "Export Academic PDF Reports",
    shortDescription: "Generate clean official-ready PDF summaries of attendance & grades",
    detailedDescription:
      "One-click export of verified attendance records, medical leave summaries, and academic progress tracking for faculty advisory submissions.",
    category: "productivity",
    iconName: "FileText",
    availableInTier: "pro",
  },
];

// ==========================================
// 3. TRUST SCORE ECONOMY RULES & PERKS
// ==========================================

export type TrustAction =
  | "COMPLETED_LEND"
  | "RETURNED_ON_TIME"
  | "RESOLVED_LOST_FOUND"
  | "POSITIVE_REVIEW"
  | "VERIFIED_STUDENT_ID"
  | "LATE_RETURN"
  | "CANCELLED_CLAIM"
  | "UNRESOLVED_DISPUTE"
  | "SPAM_REPORT";

export interface TrustScorePerk {
  minScore: number;
  title: string;
  perk: string;
  badgeName: string;
}

export interface TrustScoreConfig {
  INITIAL_SCORE: number;
  MAX_SCORE: number;
  MIN_SCORE: number;
  PERKS: TrustScorePerk[];
  ACTIONS: Record<TrustAction, number>;
}

export const TRUST_SCORE_RULES: TrustScoreConfig = {
  INITIAL_SCORE: 50,
  MAX_SCORE: 100,
  MIN_SCORE: 0,
  PERKS: [
    {
      minScore: 70,
      title: "Verified Peer",
      perk: "Verified Student Badge on Peer Feed & Listings",
      badgeName: "Verified",
    },
    {
      minScore: 80,
      title: "Trusted Lender",
      perk: "25% Deposit Reduction on Gear Lending",
      badgeName: "Trusted",
    },
    {
      minScore: 85,
      title: "Zero Deposit Eligible",
      perk: "0% Security Deposit requirement for verified gear items under ₹5,000",
      badgeName: "Zero-Deposit",
    },
    {
      minScore: 90,
      title: "Elite Campus Leader",
      perk: "Priority ProjectMate Applicant Placement & Instant Item Auto-Approve",
      badgeName: "Elite Leader",
    },
  ],
  ACTIONS: {
    COMPLETED_LEND: 10,
    RETURNED_ON_TIME: 5,
    RESOLVED_LOST_FOUND: 15,
    POSITIVE_REVIEW: 5,
    VERIFIED_STUDENT_ID: 20,
    LATE_RETURN: -15,
    CANCELLED_CLAIM: -10,
    UNRESOLVED_DISPUTE: -25,
    SPAM_REPORT: -20,
  },
};

// ==========================================
// 4. VIRAL REFERRAL & GROWTH LOOPS
// ==========================================

export interface ReferralMilestoneReward {
  requiredReferrals: number;
  rewardTitle: string;
  rewardDescription: string;
  proDaysGranted: number;
  badgeUnlocked?: string;
}

export interface ReferralProgramConfig {
  REWARD_REFERRER_PRO_DAYS: number;
  REWARD_REFERREE_PRO_DAYS: number;
  BONUS_MILESTONE_REFERRALS: number;
  MILESTONES: ReferralMilestoneReward[];
}

export const REFERRAL_PROGRAM: ReferralProgramConfig = {
  REWARD_REFERRER_PRO_DAYS: 7,
  REWARD_REFERREE_PRO_DAYS: 3,
  BONUS_MILESTONE_REFERRALS: 5, // 5 successful invites = 1 Month Pro Free
  MILESTONES: [
    {
      requiredReferrals: 3,
      rewardTitle: "Campus Connector",
      rewardDescription: "Unlock 15 Days of free Classivo Pro access",
      proDaysGranted: 15,
      badgeUnlocked: "Campus Connector",
    },
    {
      requiredReferrals: 5,
      rewardTitle: "Pro Month Pass",
      rewardDescription: "Unlock 1 Full Month of Classivo Pro access (30 days)",
      proDaysGranted: 30,
      badgeUnlocked: "Ambassador Bronze",
    },
    {
      requiredReferrals: 10,
      rewardTitle: "Campus Pass Tier Upgrade",
      rewardDescription: "Unlock 60 Days of Classivo Campus Pass (VIP)",
      proDaysGranted: 60,
      badgeUnlocked: "Campus Ambassador Gold",
    },
  ],
};

// ==========================================
// 5. PEER MARKETPLACE MONETIZATION STRATEGY
// ==========================================

export interface MarketplaceFeeTier {
  userTier: SubscriptionTierId;
  baseFeePercentage: number;
  promotedListingCostINR: number;
}

export const MARKETPLACE_MONETIZATION: Record<SubscriptionTierId, MarketplaceFeeTier> = {
  free: {
    userTier: "free",
    baseFeePercentage: 5.0, // 5% fee on rental/sale transactions
    promotedListingCostINR: 29, // ₹29 for 7 days featured listing
  },
  pro: {
    userTier: "pro",
    baseFeePercentage: 2.5, // 50% discount on transaction fee
    promotedListingCostINR: 15, // Discounted promotion cost
  },
  campus_pass: {
    userTier: "campus_pass",
    baseFeePercentage: 0.0, // 0% platform fee for VIP members
    promotedListingCostINR: 0, // Free monthly promoted listing
  },
};

// ==========================================
// 6. HELPER & STRATEGY UTILITY FUNCTIONS
// ==========================================

/**
 * Returns features enabled for a given subscription tier
 */
export function getTierFeatures(tierId: SubscriptionTierId): TierFeatures {
  return SUBSCRIPTION_TIERS[tierId]?.features || SUBSCRIPTION_TIERS.free.features;
}

/**
 * Checks if a feature is enabled for a given tier
 */
export function hasFeatureAccess(tierId: SubscriptionTierId, featureKey: keyof TierFeatures): boolean {
  const features = getTierFeatures(tierId);
  const value = features[featureKey];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}

/**
 * Calculates yearly savings in INR for upgrading to Pro or Campus Pass
 */
export function calculateYearlySavings(tierId: SubscriptionTierId): {
  monthlyTotal: number;
  yearlyPrice: number;
  savingsINR: number;
  savingsPct: number;
} {
  const tier = SUBSCRIPTION_TIERS[tierId] || SUBSCRIPTION_TIERS.pro;
  const monthlyTotal = tier.priceMonthlyINR * 12;
  const yearlyPrice = tier.priceYearlyINR;
  const savingsINR = Math.max(0, monthlyTotal - yearlyPrice);
  const savingsPct = monthlyTotal > 0 ? Math.round((savingsINR / monthlyTotal) * 100) : 0;

  return { monthlyTotal, yearlyPrice, savingsINR, savingsPct };
}

/**
 * Calculates Attendance Bunk Shield safe margins
 */
export function calculateBunkShieldMargin(
  attendedClasses: number,
  totalClasses: number,
  targetThresholdPct: number = 75
): {
  currentPct: number;
  safeBunksRemaining: number;
  classesNeededToRecover: number;
  isSafe: boolean;
  statusMessage: string;
} {
  if (totalClasses <= 0) {
    return {
      currentPct: 100,
      safeBunksRemaining: 0,
      classesNeededToRecover: 0,
      isSafe: true,
      statusMessage: "No classes conducted yet.",
    };
  }

  const currentPct = Number(((attendedClasses / totalClasses) * 100).toFixed(1));
  const targetFraction = targetThresholdPct / 100;

  if (currentPct >= targetThresholdPct) {
    // Math: (attended) / (total + X) >= targetFraction => X <= (attended - targetFraction * total) / targetFraction
    const safeBunks = Math.floor((attendedClasses - targetFraction * totalClasses) / targetFraction);
    return {
      currentPct,
      safeBunksRemaining: Math.max(0, safeBunks),
      classesNeededToRecover: 0,
      isSafe: true,
      statusMessage:
        safeBunks > 0
          ? `You can safely miss ${safeBunks} class${safeBunks > 1 ? "es" : ""} while maintaining ${targetThresholdPct}%.`
          : `You are exactly at target (${currentPct}%). Attending next lecture recommended.`,
    };
  } else {
    // Math: (attended + Y) / (total + Y) >= targetFraction => Y >= (targetFraction * total - attended) / (1 - targetFraction)
    const needed = Math.ceil((targetFraction * totalClasses - attendedClasses) / (1 - targetFraction));
    return {
      currentPct,
      safeBunksRemaining: 0,
      classesNeededToRecover: Math.max(0, needed),
      isSafe: false,
      statusMessage: `Attendance is low (${currentPct}%). You must attend the next ${needed} class${needed > 1 ? "es" : ""} continuously to reach ${targetThresholdPct}%.`,
    };
  }
}

/**
 * Evaluates current trust score tier perks & badge name
 */
export function getTrustScorePerks(trustScore: number): {
  score: number;
  perks: TrustScorePerk[];
  currentBadge: string;
  nextPerkThreshold: number | null;
} {
  const boundedScore = Math.min(
    TRUST_SCORE_RULES.MAX_SCORE,
    Math.max(TRUST_SCORE_RULES.MIN_SCORE, trustScore)
  );

  const unlockedPerks = TRUST_SCORE_RULES.PERKS.filter(p => boundedScore >= p.minScore);
  const nextPerk = TRUST_SCORE_RULES.PERKS.find(p => boundedScore < p.minScore);

  const currentBadge = unlockedPerks.length > 0 ? unlockedPerks[unlockedPerks.length - 1].badgeName : "Standard Peer";

  return {
    score: boundedScore,
    perks: unlockedPerks,
    currentBadge,
    nextPerkThreshold: nextPerk ? nextPerk.minScore : null,
  };
}

/**
 * Computes effective marketplace fee percentage for a user based on tier and trust score
 */
export function calculateEffectiveMarketplaceFee(tierId: SubscriptionTierId, trustScore: number): number {
  const baseFee = MARKETPLACE_MONETIZATION[tierId]?.baseFeePercentage ?? 5.0;
  if (baseFee === 0) return 0;

  // High trust score (>80) provides an additional 1% fee reduction
  let effectiveFee = baseFee;
  if (trustScore >= 80) {
    effectiveFee = Math.max(0, effectiveFee - 1.0);
  }

  return Number(effectiveFee.toFixed(1));
}
