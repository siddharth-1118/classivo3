"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NOVA, mono, cap } from "./tokens";
import { Haptics } from "@/utils/shared/haptics";
import { useApp } from "@/context/AppContext";
import { EncryptionUtils } from "@/utils/shared/Encryption";

const Section = ({ n, label, children }: { n: string; label: string; children: React.ReactNode }) => (
  <section className="px-5 mt-7">
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[9px] font-black tracking-widest" style={{ ...mono(), color: NOVA.orange }}>
        {n}
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: NOVA.muted }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: NOVA.border }} />
    </div>
    {children}
  </section>
);

export default function NovaDashboard({
  data,
  academia,
  onOpenSettings,
}: {
  data: any;
  academia: any;
  onOpenSettings: () => void;
}) {
  const router = useRouter();
  const { isUpdating, refreshData, lastSyncAt, connectionSource } = useApp();
  const profile = data?.profile || {};
  const name = (profile.name || "student").split(" ")[0].toLowerCase();

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const att = academia?.overallAttendance ?? 0;
  const attColor = att >= 85 ? NOVA.green : att >= 75 ? NOVA.orange : NOVA.red;
  const marks = academia?.overallMarks ?? 0;
  const nextClass = academia?.timeStatus?.nextClass || null;
  const dayOrder = academia?.effectiveDayOrder || data?.dayOrder || "—";

  const [showWaBanner, setShowWaBanner] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("classivo_wa_banner_dismissed") === "true";
    if (!dismissed) setShowWaBanner(true);
  }, []);

  const dismissWa = () => {
    Haptics.light();
    localStorage.setItem("classivo_wa_banner_dismissed", "true");
    setShowWaBanner(false);
  };

  const joinWa = () => {
    Haptics.heavy();
    window.open("https://chat.whatsapp.com/KCbxvabSvRbK96h67JF3Io", "_blank", "noopener,noreferrer");
  };

  const formatSyncTime = (iso: string | null) => {
    if (!iso) return "Never";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) + ", " +
           d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const quick = [
    { icon: "menu_book", label: "timetable", path: "/timetable", color: NOVA.orange },
    { icon: "person", label: "profile", path: "/profile", color: NOVA.blue },
    { icon: "calendar_month", label: "calendar", path: "/calendar", color: NOVA.lime },
    { icon: "list_alt", label: "marks", path: "/marks", color: NOVA.purple },
  ];

  return (
    <div className="min-h-full pb-10" style={{ background: NOVA.bg }}>
      {/* Greeting */}
      <section className="px-5 pt-7">
        <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ ...mono(), color: NOVA.lime }}>
          {today}
        </p>
        <h1 className="text-[30px] font-black tracking-tight mt-1.5" style={{ color: NOVA.text }}>
          hi, <span style={{ color: NOVA.lime }}>{cap(name)}</span>.
        </h1>
      </section>

      {/* WhatsApp community banner */}
      {showWaBanner && (
        <section className="px-5 mt-6">
          <div
            className="rounded-xl p-4 flex items-center justify-between gap-3 relative overflow-hidden"
            style={{ background: NOVA.panel, border: `1px solid ${NOVA.green}55`, borderLeft: `3px solid ${NOVA.green}` }}
          >
            <button onClick={joinWa} className="flex items-center gap-3.5 flex-1 text-left min-w-0 transition-all active:scale-[0.99]">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${NOVA.green}1a`, border: `1px solid ${NOVA.green}44` }}>
                <svg className="w-[20px] h-[20px]" viewBox="0 0 24 24" style={{ fill: NOVA.green }}>
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.66.986 3.296 1.5 5.342 1.5 5.361 0 9.724-4.364 9.728-9.728.002-2.584-1.002-5.013-2.83-6.841-1.829-1.828-4.253-2.831-6.837-2.833-5.368 0-9.733 4.362-9.737 9.729-.001 2.074.545 3.791 1.587 5.485L2.83 21.17l4.817-1.262zM17.472 14.382c-.32-.16-1.89-.933-2.185-1.041-.295-.108-.51-.16-.724.162-.213.318-.83.162-1.018.375-.187.213-.375.24-.694.08-.318-.16-1.343-.495-2.56-1.58-1.082-.966-1.748-2.222-1.959-2.581-.213-.36-.022-.554.157-.732.162-.162.36-.424.54-.636.18-.213.24-.363.36-.606.12-.24.06-.45-.03-.61-.09-.16-.724-1.745-.99-2.39-.26-.62-.52-.53-.724-.53-.188-.01-.403-.01-.617-.01-.215 0-.56.08-.853.4-.293.32-1.12 1.1-1.12 2.682 0 1.582 1.15 3.11 1.31 3.324.16.214 2.26 3.454 5.474 4.843.766.33 1.363.527 1.83.675.77.244 1.472.21 2.027.128.618-.092 1.89-.77 2.155-1.48.265-.71.265-1.317.187-1.442-.08-.124-.294-.214-.61-.375z"/>
                </svg>
              </span>
              <div className="min-w-0">
                <h4 className="text-[13px] font-black tracking-tight leading-none" style={{ color: NOVA.text }}>
                  Join Classivo Community
                </h4>
                <p className="text-[10px] font-bold mt-1 leading-tight" style={{ color: NOVA.muted }}>
                  discuss updates, share ideas, and report bugs
                </p>
              </div>
            </button>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={joinWa}
                className="px-3.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
                style={{ ...mono(), background: NOVA.green, color: NOVA.ink }}
              >
                join
              </button>
              <button
                onClick={dismissWa}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
                style={{ border: `1px solid ${NOVA.border}`, background: NOVA.bg }}
              >
                <span className="material-symbols-outlined text-[15px]" style={{ color: NOVA.faint }}>close</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Attendance + Marks side by side */}
      <Section n="01" label="overview">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => { Haptics.light(); router.push("/attendance"); }}
            className="rounded-xl p-4 text-left transition-all active:scale-95"
            style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderTop: `3px solid ${attColor}` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${attColor}22`, border: `1px solid ${attColor}55` }}
                >
                  <span className="material-symbols-outlined text-[14px]" style={{ color: attColor }}>monitoring</span>
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: NOVA.faint }}>
                  attendance
                </span>
              </div>
              <span
                className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                style={{ ...mono(), color: NOVA.ink, background: attColor }}
              >
                {att >= 75 ? "on track" : "at risk"}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-[38px] font-black leading-none" style={{ ...mono(), color: attColor }}>
                {Number(att).toFixed(1)}
              </span>
              <span className="text-[15px] font-black" style={{ ...mono(), color: NOVA.faint }}>%</span>
            </div>
            <div className="h-1.5 rounded-full mt-3 overflow-hidden" style={{ background: NOVA.border }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(att, 100)}%`, background: attColor, boxShadow: `0 0 8px ${attColor}` }}
              />
            </div>
            <p className="text-[8px] font-black uppercase tracking-widest mt-1.5" style={{ ...mono(), color: NOVA.faint }}>
              0 · 75 target · 100
            </p>
          </button>

          <button
            onClick={() => { Haptics.light(); router.push("/marks"); }}
            className="rounded-xl p-4 text-left transition-all active:scale-95"
            style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderTop: `3px solid ${NOVA.blue}` }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${NOVA.blue}22`, border: `1px solid ${NOVA.blue}55` }}
              >
                <span className="material-symbols-outlined text-[14px]" style={{ color: NOVA.blue }}>school</span>
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: NOVA.faint }}>
                marks
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-[38px] font-black leading-none" style={{ ...mono(), color: NOVA.blue }}>
                {marks ? `${marks}` : "—"}
              </span>
              {marks ? <span className="text-[15px] font-black" style={{ ...mono(), color: NOVA.faint }}>%</span> : null}
            </div>
            <div className="h-1.5 rounded-full mt-3 overflow-hidden" style={{ background: NOVA.border }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(marks, 100)}%`, background: NOVA.blue, boxShadow: `0 0 8px ${NOVA.blue}` }}
              />
            </div>
            <p className="text-[8px] font-black uppercase tracking-widest mt-1.5" style={{ ...mono(), color: NOVA.faint }}>
              internal average
            </p>
          </button>
        </div>
      </Section>

      {/* Sync Status */}
      {connectionSource && (
        <Section n="02" label="sync">
          <div
            className="rounded-xl p-4 flex items-center justify-between"
            style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderLeft: `3px solid ${NOVA.blue}` }}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${NOVA.blue}1a`, border: `1px solid ${NOVA.blue}44` }}
              >
                <span className={`material-symbols-outlined text-[16px] ${isUpdating ? "animate-spin" : ""}`} style={{ color: NOVA.blue }}>sync</span>
              </span>
              <div>
                <p className="text-[11px] font-bold" style={{ color: NOVA.text }}>
                  {isUpdating ? "Syncing..." : "Academic Data"}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ ...mono(), color: NOVA.faint }}>
                  {lastSyncAt ? `last synced: ${formatSyncTime(lastSyncAt)}` : "not yet synced"}
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                Haptics.selection();
                const creds = EncryptionUtils.loadDecrypted("classivo_credentials");
                if (creds && data) {
                  await refreshData(creds, data);
                }
              }}
              disabled={isUpdating}
              className="px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
              style={{ background: NOVA.bg, border: `1px solid ${NOVA.borderStrong}`, color: NOVA.blue }}
            >
              {isUpdating ? "syncing..." : "sync now"}
            </button>
          </div>
        </Section>
      )}

      {/* Day order + next class — two boxes side by side */}
      <Section n="03" label="today">
        <div className="grid grid-cols-5 gap-2.5">
          <button
            onClick={() => { Haptics.light(); router.push("/timetable"); }}
            className="col-span-2 rounded-xl p-4 text-left flex flex-col justify-between transition-all active:scale-95"
            style={{ background: NOVA.lime, boxShadow: `0 0 20px ${NOVA.lime}22` }}
          >
            <span className="text-[8px] font-black uppercase tracking-[0.18em]" style={{ ...mono(), color: NOVA.ink, opacity: 0.7 }}>
              day order
            </span>
            <div className="mt-2">
              <span className="text-[40px] font-black leading-none" style={{ ...mono(), color: NOVA.ink }}>
                {String(dayOrder).padStart(2, "0")}
              </span>
            </div>
          </button>
          <button
            onClick={() => { Haptics.light(); router.push("/timetable"); }}
            className="col-span-3 rounded-xl p-4 text-left flex flex-col justify-between transition-all active:scale-[0.98]"
            style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}` }}
          >
            <span
              className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded self-start"
              style={{ ...mono(), color: NOVA.ink, background: NOVA.orange }}
            >
              next class
            </span>
            {nextClass ? (
              <div className="mt-2">
                <p className="text-[13px] font-black tracking-tight leading-tight" style={{ color: NOVA.text }}>
                  {cap(String(nextClass.name || nextClass.course || nextClass.code || "class"))}
                </p>
                <p className="text-[12px] font-black mt-1.5" style={{ ...mono(), color: NOVA.lime }}>
                  {(nextClass.time || "—").split(" - ")[0]}
                </p>
              </div>
            ) : (
              <p className="text-[11px] font-semibold mt-2" style={{ color: NOVA.faint }}>no classes left today.</p>
            )}
          </button>
        </div>
      </Section>


      {/* Quick links */}
      <Section n="04" label="shortcuts">
        <div className="grid grid-cols-4 gap-2.5">
          {quick.map(({ icon, label, path, color }) => (
            <button
              key={path}
              onClick={() => { Haptics.light(); router.push(path); }}
              className="rounded-xl py-4 flex flex-col items-center gap-2 transition-all active:scale-95"
              style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderTop: `3px solid ${color}66` }}
            >
              <span
                className="w-10 h-10 rounded-[10px] flex items-center justify-center"
                style={{ background: `${color}1f`, border: `1px solid ${color}44` }}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ color }}>{icon}</span>
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: NOVA.muted }}>{label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => { Haptics.light(); onOpenSettings(); }}
          className="w-full mt-2.5 rounded-xl py-3.5 text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98]"
          style={{ background: "transparent", border: `1px dashed ${NOVA.borderStrong}`, color: NOVA.muted }}
        >
          open settings →
        </button>
      </Section>
    </div>
  );
}


