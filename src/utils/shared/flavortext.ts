export const flavorText = {
  header: {
    cooked: [
      "attendance level is critical",
      "action required to restore attendance",
      "need to attend upcoming classes",
      "alert: attendance below threshold",
      "requires immediate attendance improvement",
    ],
    danger: [
      "attendance is close to the threshold",
      "maintain presence to stay safe",
      "caution: minimal margin for absences",
      "keep attending to secure your record",
    ],
    safe: [
      "attendance requirements successfully met",
      "excellent attendance record",
      "consistent presence - keep it up",
      "great job maintaining your schedule",
    ],
  },
  marks: {
    cooked: [
      "performance needs immediate improvement",
      "recommended to seek academic support",
      "focus on upcoming assessments to recover",
      "review course materials and lecture notes",
      "consult your instructor for guidance",
    ],
    danger: [
      "borderline academic performance",
      "consistent preparation is recommended",
      "aim for higher scores in next tests",
      "stay focused on upcoming assignments",
    ],
    safe: [
      "outstanding academic progress",
      "excellent performance - keep it up",
      "strong marks record detected",
      "great understanding of the course content",
    ],
    neutral: [
      "waiting for performance records",
      "academic results pending update",
      "keep monitoring for grade updates",
      "no assessments recorded yet",
    ],
  },
  badges: {
    low: ["focus", "alert", "improve", "review", "caution"],
    mid: ["satisfactory", "steady", "developing", "average"],
    high: ["excellent", "outstanding", "great", "top tier"],
  },
  freeTime: [
    "time to recharge and relax",
    "perfect window for self-study",
    "take a quick breather",
    "review your notes or take a break",
    "no active classes scheduled",
  ],
  timetable: [
    "your schedule is looking organized.",
    "plan your academic day ahead.",
    "stay consistent and keep learning.",
    "wishing you a productive day of classes.",
  ],
  loading: [
    "fetching your academic records...",
    "organizing your schedule...",
    "updating attendance database...",
    "securing connection to portal...",
    "rendering your dashboard...",
    "syncing recent results...",
    "waking up the database server...",
  ],
};

export const getRandomRoast = (
  category: "cooked" | "danger" | "safe" | "neutral",
  section: "header" | "marks" = "marks"
) => {
  const sectionData = (flavorText as any)[section] || flavorText.marks;
  const roasts = sectionData[category] || sectionData.neutral || sectionData.cooked;
  return roasts[Math.floor(Math.random() * roasts.length)];
};
