"use client";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Haptics } from "@/utils/shared/haptics";
import { NOVA, mono, SPRINGS } from "./tokens";

const TABS = [
  { id: "home", label: "home", path: "/", icon: "grid_view", color: NOVA.lime },
  { id: "attendance", label: "radar", path: "/attendance", icon: "analytics", color: NOVA.blue },
  { id: "timetable", label: "agenda", path: "/timetable", icon: "event_note", color: NOVA.orange },
  { id: "marks", label: "courses", path: "/marks", icon: "auto_stories", color: NOVA.gold },
];

export default function NovaShell({
  children,
  onOpenSettings,
  onRefresh,
  isRefreshing,
}: {
  children: React.ReactNode;
  onOpenSettings: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      className="relative h-full w-full flex flex-col overflow-hidden select-none"
      style={{ background: NOVA.bg, color: NOVA.text }}
    >
      {/* Ambient Backdrop Glows */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[200px] bg-sky-500/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-12 right-1/4 w-[350px] h-[200px] bg-lime-500/05 blur-[120px] pointer-events-none rounded-full" />

      {/* Top Glass Header */}
      <header
        className="shrink-0 flex items-center justify-between px-5 h-15 z-50 backdrop-blur-2xl transition-all duration-300"
        style={{
          borderBottom: `1px solid ${NOVA.borderStrong}`,
          background: "linear-gradient(180deg, rgba(10, 13, 20, 0.92) 0%, rgba(10, 13, 20, 0.78) 100%)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35)",
        }}
      >
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={SPRINGS.smooth}
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => router.push("/")}
        >
          <div
            className="relative w-8.5 h-8.5 rounded-xl flex items-center justify-center overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${NOVA.lime}28 0%, ${NOVA.blue}28 100%)`,
              border: `1px solid ${NOVA.lime}55`,
              boxShadow: `0 0 20px ${NOVA.lime}35, inset 0 1px 1px rgba(255, 255, 255, 0.3)`,
            }}
          >
            <span className="material-symbols-outlined text-[17px] font-black" style={{ color: NOVA.lime }}>
              diamond
            </span>
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-lime-400 to-sky-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[19px] font-black lowercase tracking-tight" style={{ color: NOVA.text }}>
              classivo
            </span>
            <motion.span
              animate={{ boxShadow: [`0 0 8px ${NOVA.lime}40`, `0 0 18px ${NOVA.cyan}60`, `0 0 8px ${NOVA.lime}40`] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{
                ...mono(),
                color: NOVA.ink,
                background: `linear-gradient(90deg, ${NOVA.lime}, ${NOVA.cyan})`,
              }}
            >
              v2
            </motion.span>
          </div>
        </motion.div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              transition={SPRINGS.bouncy}
              onClick={() => {
                Haptics.light();
                onRefresh();
              }}
              className="w-9.5 h-9.5 rounded-full flex items-center justify-center transition-all hover:border-sky-400/50"
              style={{
                border: `1px solid ${NOVA.borderStrong}`,
                background: "linear-gradient(135deg, rgba(24, 32, 50, 0.8) 0%, rgba(14, 18, 28, 0.7) 100%)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              }}
              title="Refresh Portal Data"
            >
              <span
                className={`material-symbols-outlined text-[18px] transition-all ${isRefreshing ? "animate-spin" : ""}`}
                style={{ color: NOVA.blue }}
              >
                refresh
              </span>
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            transition={SPRINGS.bouncy}
            onClick={() => {
              Haptics.selection();
              onOpenSettings();
            }}
            className="w-9.5 h-9.5 rounded-full flex items-center justify-center transition-all hover:border-slate-400/50"
            style={{
              border: `1px solid ${NOVA.borderStrong}`,
              background: "linear-gradient(135deg, rgba(24, 32, 50, 0.8) 0%, rgba(14, 18, 28, 0.7) 100%)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            }}
            title="Settings"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ color: NOVA.text }}>
              tune
            </span>
          </motion.button>
        </div>
      </header>

      {/* Scrollable content container */}
      <div className="flex-1 overflow-y-auto no-scrollbar">{children}</div>

      {/* Bottom Ticket Navigation */}
      <nav
        className="shrink-0 px-4 pt-2.5 pb-1.5 z-50 backdrop-blur-2xl transition-all"
        style={{
          borderTop: `1px solid ${NOVA.borderStrong}`,
          background: "linear-gradient(0deg, rgba(10, 13, 20, 0.96) 0%, rgba(10, 13, 20, 0.85) 100%)",
        }}
      >
        <div
          className="relative flex items-stretch justify-around max-w-md mx-auto rounded-2xl p-1.5 shadow-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(18, 24, 38, 0.85) 0%, rgba(12, 16, 26, 0.75) 100%)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: `1px solid ${NOVA.borderHighlight}`,
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1)",
          }}
        >
          {TABS.map(({ id, label, path, icon, color }) => {
            const safe = pathname ?? "";
            const isActive = path === "/" ? safe === "/" : safe.startsWith(path);
            return (
              <motion.button
                key={id}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.93 }}
                transition={SPRINGS.smooth}
                onClick={() => {
                  Haptics.light();
                  router.push(path);
                }}
                className="relative flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 px-2.5 transition-all z-10"
              >
                {isActive && (
                  <motion.div
                    layoutId="novaActiveTabPill"
                    transition={SPRINGS.smooth}
                    className="absolute inset-0 rounded-xl z-0"
                    style={{
                      background: color,
                      boxShadow: `0 4px 20px ${color}55, inset 0 1px 1px rgba(255, 255, 255, 0.3)`,
                    }}
                  />
                )}
                <span
                  className="material-symbols-outlined text-[21px] relative z-10 transition-transform duration-200"
                  style={{
                    fontVariationSettings: isActive ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400",
                    color: isActive ? "#060911" : color,
                    opacity: isActive ? 1 : 0.65,
                  }}
                >
                  {icon}
                </span>
                <span
                  className="text-[9px] font-black uppercase tracking-[0.14em] relative z-10 transition-colors"
                  style={{ color: isActive ? "#060911" : NOVA.faint }}
                >
                  {label}
                </span>
              </motion.button>
            );
          })}
        </div>
        <p
          className="text-center text-[8.5px] font-black uppercase tracking-[0.26em] py-2 opacity-65 flex items-center justify-center gap-1.5"
          style={{ ...mono(), color: NOVA.faint }}
        >
          <span className="w-1 h-1 rounded-full bg-lime-400 animate-pulse" />
          classivo v2 // {pathLabel(pathname)}
        </p>
      </nav>
    </div>
  );
}

function pathLabel(pathname: string | null) {
  const p = pathname ?? "/";
  if (p.startsWith("/timetable")) return "timetable";
  if (p.startsWith("/attendance")) return "attendance";
  if (p.startsWith("/marks")) return "marks";
  if (p.startsWith("/calendar")) return "calendar";
  if (p.startsWith("/profile")) return "profile";
  if (p.startsWith("/developers")) return "developers";
  return "dashboard";
}
