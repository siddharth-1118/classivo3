"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { NOVA, mono } from "./tokens";

const FEATURES = [
  { n: "01", title: "Agenda Timetable", desc: "calendar-driven weekly slots, day orders, rooms & faculty.", icon: "event_note", color: NOVA.orange },
  { n: "02", title: "Attendance Radar", desc: "live percentages, skip budgets, and recovery math per subject.", icon: "analytics", color: NOVA.blue },
  { n: "03", title: "Courses & Marks", desc: "internal averages, grades, and subject performance at a glance.", icon: "ssid_chart", color: NOVA.lime },
  { n: "04", title: "Academic Planner", desc: "day orders, holidays, and exam weeks synced to the calendar.", icon: "calendar_month", color: NOVA.gold },
  { n: "05", title: "Profile Manager", desc: "your identity, contact, and academic details in one place.", icon: "person", color: NOVA.purple },
  { n: "06", title: "Smart Utilities", desc: "notifications, sync, and handy tools tuned for student life.", icon: "bolt", color: NOVA.cyan },
];

export default function NovaLanding() {
  const router = useRouter();

  return (
    <div className="min-h-screen" style={{ background: NOVA.bg, color: NOVA.text }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto" style={{ borderBottom: `1px solid ${NOVA.border}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: NOVA.ink, boxShadow: `0 0 18px ${NOVA.lime}33` }}>
            <span className="material-symbols-outlined text-[15px] font-black" style={{ color: NOVA.lime }}>diamond</span>
          </div>
          <span className="text-[18px] font-black lowercase tracking-tight">classivo</span>
          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ ...mono(), color: NOVA.ink, background: NOVA.orange }}>v2</span>
        </div>
        <button
          onClick={() => router.push("/login")}
          className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          style={{ border: `1px solid ${NOVA.borderStrong}`, color: NOVA.lime }}
        >
          sign in
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6">
        {/* Hero */}
        <section className="pt-16 pb-12 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ ...mono(), color: NOVA.orange }}>
            srmist companion · v2.0
          </p>
          <h1 className="text-[46px] sm:text-[60px] font-black tracking-tight leading-[1.02] mt-4" style={{ color: NOVA.text }}>
            Recompiled.
          </h1>
          <p className="text-[15px] font-semibold mt-3" style={{ color: NOVA.muted }}>
            Your academic companion.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-8 px-10 py-4 rounded-xl text-[13px] font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98]"
            style={{ background: NOVA.lime, color: NOVA.ink, boxShadow: `0 0 30px ${NOVA.lime}33` }}
          >
            get started →
          </button>
        </section>

        {/* Features */}
        <section className="pb-12">
          <div className="grid grid-cols-2 gap-2.5">
            {FEATURES.map(({ n, title, desc, icon, color }) => (
              <div
                key={n}
                className="rounded-xl p-4 flex flex-col"
                style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderTop: `3px solid ${color}` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black shrink-0" style={{ ...mono(), color: NOVA.orange }}>{n}</span>
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}1a`, border: `1px solid ${color}44` }}>
                    <span className="material-symbols-outlined text-[15px]" style={{ color }}>{icon}</span>
                  </span>
                </div>
                <h3 className="text-[13px] font-black tracking-tight mt-2.5" style={{ color: NOVA.text }}>{title}</h3>
                <p className="text-[11px] font-medium mt-1 leading-snug" style={{ color: NOVA.muted }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-10 text-center" style={{ borderTop: `1px solid ${NOVA.border}` }}>
          <p className="text-[11px] font-semibold" style={{ color: NOVA.muted }}>
            already have an account?{" "}
            <button onClick={() => router.push("/login")} className="font-black uppercase tracking-widest" style={{ color: NOVA.lime }}>
              login
            </button>
          </p>
          <a href="/developers" className="inline-block text-[9px] font-black uppercase tracking-widest mt-4" style={{ ...mono(), color: NOVA.faint }}>
            designed &amp; developed by sai siddharth vooka
          </a>
        </footer>
      </main>
    </div>
  );
}
