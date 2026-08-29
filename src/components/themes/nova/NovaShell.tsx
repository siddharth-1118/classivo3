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
      {/* Top header */}
      <header
        className="shrink-0 flex items-center justify-between px-5 h-14 z-50"
        style={{ borderBottom: `1px solid ${NOVA.border}` }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center"
            style={{ background: NOVA.ink, boxShadow: `0 0 18px ${NOVA.lime}33` }}
          >
            <span className="material-symbols-outlined text-[15px] font-black" style={{ color: NOVA.lime }}>diamond</span>
          </div>
          <span className="text-[17px] font-black lowercase tracking-tight" style={{ color: NOVA.text }}>
            classivo
          </span>
          <span
            className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{ ...mono(), color: NOVA.ink, background: NOVA.orange }}
          >
            v2
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={() => { Haptics.light(); onRefresh(); }}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ border: `1px solid ${NOVA.border}`, background: NOVA.panel }}
            >
              <span className={`material-symbols-outlined text-[17px] ${isRefreshing ? "animate-spin" : ""}`} style={{ color: NOVA.blue }}>refresh</span>
            </button>
          )}
          <button
            onClick={() => { Haptics.selection(); onOpenSettings(); }}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ border: `1px solid ${NOVA.border}`, background: NOVA.panel }}
          >
            <span className="material-symbols-outlined text-[17px]" style={{ color: NOVA.text }}>tune</span>
          </button>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">{children}</div>

      {/* Bottom ticket nav */}
      <nav
        className="shrink-0 px-4 pt-1.5"
        style={{ borderTop: `1px solid ${NOVA.border}`, background: NOVA.bg }}
      >
        <div
          className="flex items-stretch justify-around max-w-sm mx-auto rounded-xl p-1"
          style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}` }}
        >
          {TABS.map(({ id, label, path, icon, color }) => {
            const safe = pathname ?? "";
            const isActive = path === "/" ? safe === "/" : safe.startsWith(path);
            return (
              <button
                key={id}
                onClick={() => { Haptics.light(); router.push(path); }}
                className="flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all active:scale-95"
                style={{
                  minWidth: 64,
                  padding: "7px 10px",
                  background: isActive ? color : "transparent",
                  boxShadow: isActive ? `0 0 16px ${color}33` : "none",
                }}
              >
                <span
                  className="material-symbols-outlined text-[20px] transition-all"
                  style={{
                    fontVariationSettings: isActive ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400",
                    color: isActive ? "#0b0c10" : color,
                    opacity: isActive ? 1 : 0.55,
                  }}
                >
                  {icon}
                </span>
                <span
                  className="text-[8px] font-black uppercase tracking-[0.14em]"
                  style={{ color: isActive ? "#0b0c10" : NOVA.faint }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-center text-[8px] font-black uppercase tracking-[0.22em] py-2" style={{ ...mono(), color: NOVA.faint }}>
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
