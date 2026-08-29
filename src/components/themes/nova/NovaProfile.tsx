"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { NOVA, mono, cap } from "./tokens";
import { Haptics } from "@/utils/shared/haptics";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const YEAR_LABELS = ["", "First Year", "Second Year", "Third Year", "Fourth Year"];

export default function NovaProfile() {
  const { userData, logout, customDisplayName, academicYearLevel, connectionSource } = useApp();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const profile: any = userData?.profile || {};
  const name = customDisplayName || profile.name || "Student";

  // Year detection from semester
  const semester = profile.semester ? parseInt(String(profile.semester), 10) : null;
  const detectedYear = semester ? Math.ceil(semester / 2) : academicYearLevel;
  const isSecondYearPlus = (detectedYear || 1) >= 2;
  const portalConnected = connectionSource === "srm_portal" || userData?.portalConnected === true;
  const needsPortalPrompt = isSecondYearPlus && !portalConnected;

  const rows = [
    { icon: "apartment", label: "department", value: profile.dept },
    { icon: "calendar_month", label: "semester", value: profile.semester ? `sem ${profile.semester}` : undefined },
    { icon: "groups", label: "section", value: profile.section },
    { icon: "badge", label: "batch", value: profile.batch },
    { icon: "mail", label: "email", value: profile.email },
  ].filter((r) => r.value);

  const hostelRows = userData?.hostel?.hostel ? [
    { icon: "home", label: "hostel name", value: userData.hostel.hostel.hostelName },
    { icon: "meeting_room", label: "room number", value: userData.hostel.hostel.roomNo },
    { icon: "event", label: "allotment date", value: userData.hostel.hostel.allotmentDate },
  ].filter(r => r.value) : [];

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await logout(); } catch {}
    setLoggingOut(false);
  };

  return (
    <div className="min-h-full pb-10" style={{ background: NOVA.bg }}>
      <section className="px-5 pt-7">
        <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ ...mono(), color: NOVA.lime }}>
          profile
        </p>
        <h1 className="text-[30px] font-black tracking-tight mt-1.5" style={{ color: NOVA.text }}>
          My Space
        </h1>
      </section>

      <section className="px-5 mt-6 flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center text-[22px] font-black shrink-0"
          style={{ background: NOVA.lime, color: NOVA.ink, boxShadow: `0 0 24px ${NOVA.lime}33` }}
        >
          {initials(name)}
        </div>
        <div className="min-w-0">
          <h2 className="text-[22px] font-black tracking-tight truncate" style={{ color: NOVA.text }}>
            {cap(name)}
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1" style={{ ...mono(), color: NOVA.orange }}>
            {profile.regNo || "student"}
          </p>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {profile.dept && (
              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded" style={{ ...mono(), color: NOVA.ink, background: NOVA.lime }}>
                {String(profile.dept).toLowerCase()}
              </span>
            )}
            {profile.semester && (
              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded" style={{ ...mono(), color: NOVA.blue, background: `${NOVA.blue}14`, border: `1px solid ${NOVA.blue}44` }}>
                sem {profile.semester}
              </span>
            )}
            {detectedYear && (
              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded" style={{ ...mono(), color: NOVA.orange, background: `${NOVA.orange}14`, border: `1px solid ${NOVA.orange}44` }}>
                {YEAR_LABELS[detectedYear]}
              </span>
            )}
          </div>
        </div>
      </section>

      {profile.cgpa && (
        <section className="px-5 mt-6">
          <div
            className="rounded-xl p-5 flex items-center justify-between"
            style={{ background: NOVA.panel2, border: `1px solid ${NOVA.borderStrong}` }}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: NOVA.faint }}>
              cgpa
            </span>
            <span className="text-[32px] font-black" style={{ ...mono(), color: NOVA.gold }}>{profile.cgpa}</span>
          </div>
        </section>
      )}

      <section className="px-5 mt-6">
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NOVA.border}` }}>
          {rows.map((r, i) => (
            <div
              key={r.label}
              className="flex items-center gap-4 px-4 py-3.5"
              style={{ background: NOVA.panel, borderBottom: i < rows.length - 1 ? `1px solid ${NOVA.border}` : "none" }}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ color: NOVA.blue }}>{r.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: NOVA.faint }}>{r.label}</p>
                <p className="text-[13px] font-bold truncate mt-0.5" style={{ color: NOVA.text }}>{r.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SRM Portal Connection Prompt for 2nd year+ */}
      {needsPortalPrompt && (
        <section className="px-5 mt-6">
          <div
            className="rounded-xl p-4"
            style={{ background: `${NOVA.orange}11`, border: `1px solid ${NOVA.orange}33` }}
          >
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5" style={{ color: NOVA.orange }}>warning</span>
              <div className="flex-1">
                <p className="text-[13px] font-bold" style={{ color: NOVA.text }}>
                  Connect SRM Student Portal
                </p>
                <p className="text-[11px] font-medium mt-1" style={{ color: NOVA.muted }}>
                  As a {YEAR_LABELS[detectedYear || 2]} student, connect your SRM Student Portal to view attendance and marks data.
                </p>
                <button
                  onClick={() => { Haptics.selection(); router.push("/login"); }}
                  className="mt-3 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest"
                  style={{ ...mono(), background: NOVA.orange, color: NOVA.ink }}
                >
                  Connect Now
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {hostelRows.length > 0 && (
        <section className="px-5 mt-6">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-1.5" style={{ ...mono(), color: NOVA.lime }}>
            hostel accommodation
          </p>
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NOVA.border}` }}>
            {hostelRows.map((r, i) => (
              <div
                key={r.label}
                className="flex items-center gap-4 px-4 py-3.5"
                style={{ background: NOVA.panel, borderBottom: i < hostelRows.length - 1 ? `1px solid ${NOVA.border}` : "none" }}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ color: NOVA.blue }}>{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: NOVA.faint }}>{r.label}</p>
                  <p className="text-[13px] font-bold truncate mt-0.5" style={{ color: NOVA.text }}>{r.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="px-5 mt-6">
        <button
          onClick={() => { Haptics.warning(); setConfirming(true); }}
          className="w-full rounded-xl py-3.5 text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98]"
          style={{ background: "rgba(255,93,93,0.08)", border: `1px solid rgba(255,93,93,0.35)`, color: NOVA.red }}
        >
          logout
        </button>
      </section>

      {confirming && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-5" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-xl p-5" style={{ background: NOVA.panel2, border: `1px solid ${NOVA.borderStrong}` }}>
            <h3 className="text-[16px] font-black tracking-tight" style={{ color: NOVA.text }}>Logout?</h3>
            <p className="text-[12px] font-medium mt-1.5" style={{ color: NOVA.muted }}>
              your session and local data will be cleared.
            </p>
            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-lg py-3 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                style={{ border: `1px solid ${NOVA.borderStrong}`, color: NOVA.muted }}
              >
                cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex-1 rounded-lg py-3 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                style={{ background: NOVA.red, color: "#0b0c10" }}
              >
                {loggingOut ? "bye..." : "logout"}
              </button>
            </div>
            <button onClick={() => router.back()} className="mt-3 w-full text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: NOVA.faint }}>
              ← back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
