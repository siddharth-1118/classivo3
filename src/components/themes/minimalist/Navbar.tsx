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
];

export default function Navbar() {
  const pathname = usePathname();

  // Don't show navbar on login or onboarding screens
  if (pathname === "/login" || pathname === "/onboarding") return null;

  return (
    <div className="relative w-full shrink-0 select-none z-50 px-5 pb-4 pt-1 pointer-events-none">
      <style dangerouslySetInnerHTML={{ __html: `
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 8px);
        }
      `}} />
      <nav className="pointer-events-auto relative flex justify-around items-center mx-auto max-w-sm rounded-[26px] py-2 px-3 pb-safe border border-white/10"
        style={{
          background: "rgba(11,15,30,0.82)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 12px 40px rgba(2,6,23,0.6), 0 0 0 1px rgba(110,231,247,0.06), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {tabs.map(({ id, label, path, icon }) => {
          const safePath = pathname ?? "";
          const isActive = path === "/" ? safePath === "/" : safePath.startsWith(path);

          return (
            <Link
              key={id}
              href={path}
              onClick={() => Haptics.light()}
              className="relative flex flex-col items-center justify-center rounded-2xl transition-all active:scale-90 duration-200"
              style={{ minWidth: 58, padding: "8px 10px" }}
            >
              {/* Active glow pill */}
              {isActive && (
                <span
                  className="absolute -inset-0.5 rounded-2xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(34,211,238,0.16) 0%, rgba(129,140,248,0.16) 100%)",
                    border: "1px solid rgba(110,231,247,0.28)",
                    boxShadow: "0 4px 18px rgba(34,211,238,0.2)",
                  }}
                />
              )}

              <span
                className="material-symbols-outlined relative z-10 text-[22px] transition-colors duration-300"
                style={{
                  fontVariationSettings: isActive ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400",
                  color: isActive ? "#6ee7f7" : "rgba(238,242,255,0.45)",
                  textShadow: isActive ? "0 0 14px rgba(110,231,247,0.55)" : "none",
                }}
              >
                {icon}
              </span>
              <span
                className="relative z-10 text-[8.5px] font-bold uppercase tracking-[0.14em] mt-1 transition-colors duration-300"
                style={{
                  color: isActive ? "#a5f3fc" : "rgba(238,242,255,0.35)",
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
