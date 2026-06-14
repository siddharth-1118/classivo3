"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Haptics } from "@/utils/shared/haptics";

const tabs = [
  { id: "home",       label: "home",     path: "/",           icon: "grid_view" },
  { id: "attendance", label: "radar",    path: "/attendance", icon: "analytics" },
  { id: "timetable",  label: "agenda",   path: "/timetable",  icon: "event_note" },
  { id: "marks",      label: "courses",  path: "/marks",      icon: "auto_stories" },
  { id: "lost-found", label: "feed",     path: "/lost-found", icon: "dynamic_feed" },
];

export default function Navbar() {
  const pathname = usePathname();

  // Don't show navbar on login, onboarding, or lost-found screens
  if (pathname === "/login" || pathname === "/onboarding" || pathname?.startsWith("/lost-found")) return null;

  return (
    <nav className="rounded-t-xl bg-surface-container-low/40 backdrop-blur-xl border-t border-outline-variant/10 w-full shrink-0 select-none relative z-50">
      <style jsx>{`
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 8px);
        }
      `}</style>
      <div className="flex justify-around items-center px-4 pb-safe pt-2 h-20 w-full max-w-2xl mx-auto">
        {tabs.map(({ id, label, path, icon }) => {
          // Active if pathname matches exactly, or for subpaths (except /)
          const isActive = path === "/" ? pathname === "/" : pathname.startsWith(path);
          
          return (
            <Link
              key={id}
              href={path}
              onClick={() => Haptics.light()}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all active:scale-90 duration-200 ${
                isActive
                  ? "text-primary-container bg-primary-container/10 border-primary-container/20 shadow-[0_0_15px_rgba(110,231,247,0.15)]"
                  : "text-on-surface-variant hover:text-primary border-transparent"
              }`}
              style={{ minWidth: "64px" }}
            >
              <span 
                className="material-symbols-outlined text-[24px]"
                style={{
                  fontVariationSettings: isActive ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400",
                  textShadow: isActive ? "0 0 10px rgba(110,231,247,0.4)" : "none"
                }}
              >
                {icon}
              </span>
              <span 
                className="text-[9px] font-label-caps uppercase tracking-wider mt-1"
                style={{
                  color: isActive ? "var(--primary-container)" : "inherit"
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
