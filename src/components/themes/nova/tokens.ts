// Nova v2 — "Carbon Glass" design tokens & visual polish helpers
import { Transition } from "framer-motion";

export const NOVA = {
  bg: "#0A0D14", // obsidian navy-charcoal
  panel: "rgba(18, 24, 38, 0.75)", // glass panel
  panelSolid: "#121826",
  panel2: "#182032", // deep container
  panelGlass: "rgba(18, 24, 38, 0.55)", // translucent glass container
  border: "rgba(255, 255, 255, 0.08)", // subtle glass border
  borderStrong: "rgba(255, 255, 255, 0.16)",
  borderHighlight: "rgba(255, 255, 255, 0.24)",
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

export const SPRINGS: Record<string, Transition> = {
  smooth: { type: "spring" as const, stiffness: 320, damping: 28 },
  bouncy: { type: "spring" as const, stiffness: 420, damping: 22 },
  gentle: { type: "spring" as const, stiffness: 220, damping: 26 },
  stiff: { type: "spring" as const, stiffness: 500, damping: 32 },
};

export function mono(extra = "") {
  return { fontFamily: `${FONT_MONO}${extra ? "," + extra : ""}` };
}

export function glassCard(glowColor: string = NOVA.blue, borderAlpha = "26") {
  return {
    background: "linear-gradient(135deg, rgba(22, 30, 48, 0.82) 0%, rgba(14, 18, 30, 0.72) 100%)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: `1px solid ${NOVA.borderStrong}`,
    boxShadow: `0 12px 36px 0 rgba(0, 0, 0, 0.45), 0 0 28px 0 ${glowColor}${borderAlpha}, inset 0 1px 1px 0 rgba(255, 255, 255, 0.14)`,
  };
}

export function carbonGlass(glowColor: string = NOVA.blue, borderAlpha = "33") {
  return {
    background: "linear-gradient(145deg, rgba(24, 32, 50, 0.85) 0%, rgba(12, 16, 26, 0.75) 100%)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: `1px solid ${glowColor}${borderAlpha}`,
    boxShadow: `0 16px 40px 0 rgba(0, 0, 0, 0.5), 0 0 32px 0 ${glowColor}1a, inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.16)`,
  };
}

export function statusBadge(color: string, filled = false) {
  if (filled) {
    return {
      background: color,
      color: NOVA.ink,
      boxShadow: `0 0 18px ${color}66`,
      border: `1px solid ${color}`,
    };
  }
  return {
    background: `${color}1a`,
    color: color,
    border: `1px solid ${color}44`,
    boxShadow: `0 0 12px ${color}22`,
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

