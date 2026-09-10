// Nova v2 — "Carbon Glass" design tokens
export const NOVA = {
  bg: "#0A0D14", // obsidian navy-charcoal
  panel: "rgba(18, 24, 38, 0.75)", // glass panel
  panelSolid: "#121826",
  panel2: "#182032", // deep container
  border: "rgba(255, 255, 255, 0.08)", // subtle glass border
  borderStrong: "rgba(255, 255, 255, 0.16)",
  text: "#F8FAFC", // crisp off-white
  muted: "#94A3B8", // slate muted
  faint: "#64748B", // slate faint
  ink: "#050505", // text on bright fills
  lime: "#A8FF00", // neon green
  orange: "#FF7800",
  blue: "#38BDF8", // sky cyan
  green: "#22C55E",
  red: "#F43F5E",
  gold: "#FACC15",
  pink: "#EC4899",
  purple: "#A855F7",
  cyan: "#06B6D4",
  teal: "#14B8A6",
  amber: "#F59E0B",
  indigo: "#6366F1",
} as const;

export const FONT_MONO = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
export const FONT_SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export function mono(extra = "") {
  return { fontFamily: `${FONT_MONO}${extra ? "," + extra : ""}` };
}

export function glassCard(glowColor = NOVA.blue, borderAlpha = "26") {
  return {
    background: NOVA.panel,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: `1px solid ${NOVA.border}`,
    boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37), 0 0 20px 0 ${glowColor}${borderAlpha}`,
  };
}

// Capitalize the first letter of a string (sentence case)
export function cap(str: string) {
  const s = String(str || "").trim();
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Capitalize the first letter of every word (title case)
export function titleCase(str: string) {
  return String(str || "")
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}
