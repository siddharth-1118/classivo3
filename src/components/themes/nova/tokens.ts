// Nova v2 — "Carbon" design tokens
// Dark neon "terminal" palette per the v2 spec
export const NOVA = {
  bg: "#0C0C0C", // deep charcoal
  panel: "#141414", // panel
  panel2: "#1B1B1B", // panel deep
  border: "#262626", // hairline
  borderStrong: "#3A3A3A",
  text: "#F4F4F4", // near-white
  muted: "#9B9B9B",
  faint: "#5F5F5F",
  ink: "#050505", // near-black for text on bright fills
  lime: "#A8FF00", // neon green
  orange: "#FF7800",
  blue: "#00A6FF",
  green: "#A8FF00",
  red: "#FF4D4D",
  gold: "#FFD166",
  pink: "#FF5EC8",
  purple: "#A800FF",
  cyan: "#00E5FF",
  teal: "#00C9A7",
  amber: "#FFB84D",
  indigo: "#7C6CFF",
} as const;

export const FONT_MONO = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
export const FONT_SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export function mono(extra = "") {
  return { fontFamily: `${FONT_MONO}${extra ? "," + extra : ""}` };
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
