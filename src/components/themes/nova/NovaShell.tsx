"use client";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Haptics } from "@/utils/shared/haptics";
import { NOVA, mono } from "./tokens";

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
      {/* Top Glass Header */}
      <header
        className="shrink-0 flex items-center justify-between px-5 h-14 z-50 backdrop-blur-xl"
        style={{
          borderBottom: `1px solid ${NOVA.border}`,
          background: "rgba(10, 13, 20, 0.85)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${NOVA.lime}22 0%, ${NOVA.blue}22 100%)`,
              border: `1px solid ${NOVA.lime}44`,
              boxShadow: `0 0 16px ${NOVA.lime}26`,
            }}
          >
            <span className="material-symbols-outlined text-[16px] font-black" style={{ color: NOVA.lime }}>
              diamond
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[18px] font-black lowercase tracking-tight" style={{ color: NOVA.text }}>
              classivo
            </span>
            <span
              className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
              style={{
                ...mono(),
                color: NOVA.ink,
                background: `linear-gradient(90deg, ${NOVA.lime}, ${NOVA.cyan})`,
                boxShadow: `0 0 12px ${NOVA.lime}40`,
              }}
            >
              v2
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={() => {
                Haptics.light();
                onRefresh();
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 hover:border-sky-400/40"
              style={{
                border: `1px solid ${NOVA.border}`,
                background: NOVA.panel,
                backdropFilter: "blur(12px)",
              }}
              title="Refresh Portal Data"
            >
              <span
                className={`material-symbols-outlined text-[17px] ${isRefreshing ? "animate-spin" : ""}`}
                style={{ color: NOVA.blue }}
              >
                refresh
              </span>
            </button>
          )}
          <button
            onClick={() => {
              Haptics.selection();
              onOpenSettings();
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 hover:border-slate-400/40"
            style={{
              border: `1px solid ${NOVA.border}`,
              background: NOVA.panel,
              backdropFilter: "blur(12px)",
            }}
            title="Settings"
          >
            <span className="material-symbols-outlined text-[17px]" style={{ color: NOVA.text }}>
              tune
            </span>
          </button>
        </div>
      </header>

      {/* Scrollable content container */}
      <div className="flex-1 overflow-y-auto no-scrollbar">{children}</div>

      {/* Bottom Ticket Navigation */}
      <nav
        className="shrink-0 px-4 pt-2 pb-1 backdrop-blur-xl"
        style={{
          borderTop: `1px solid ${NOVA.border}`,
          background: "rgba(10, 13, 20, 0.9)",
        }}
      >
        <div
          className="flex items-stretch justify-around max-w-sm mx-auto rounded-2xl p-1.5 shadow-2xl"
          style={{
            background: NOVA.panel,
            backdropFilter: "blur(20px)",
            border: `1px solid ${NOVA.borderStrong}`,
          }}
        >
          {TABS.map(({ id, label, path, icon, color }) => {
            const safe = pathname ?? "";
            const isActive = path === "/" ? safe === "/" : safe.startsWith(path);
            return (
              <button
                key={id}
                onClick={() => {
                  Haptics.light();
                  router.push(path);
                }}
                className="flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95"
                style={{
                  minWidth: 68,
                  padding: "8px 12px",
                  background: isActive ? color : "transparent",
                  boxShadow: isActive ? `0 4px 20px ${color}44` : "none",
                }}
              >
                <span
                  className="material-symbols-outlined text-[20px] transition-all"
                  style={{
                    fontVariationSettings: isActive ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400",
                    color: isActive ? "#060911" : color,
                    opacity: isActive ? 1 : 0.6,
                  }}
                >
                  {icon}
                </span>
                <span
                  className="text-[8.5px] font-black uppercase tracking-[0.14em]"
                  style={{ color: isActive ? "#060911" : NOVA.faint }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
        <p
          className="text-center text-[8px] font-black uppercase tracking-[0.24em] py-1.5 opacity-60"
          style={{ ...mono(), color: NOVA.faint }}
        >
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
