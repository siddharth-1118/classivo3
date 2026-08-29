"use client";
import React, { useState, useCallback } from "react";
import { NOVA, mono, cap } from "./tokens";
import { Haptics } from "@/utils/shared/haptics";
import { useApp } from "@/context/AppContext";
import { fetchWithLoadBalancer } from "@/utils/backendProxy";

const YEAR_LABELS = ["", "First Year", "Second Year", "Third Year", "Fourth Year"];

export default function NovaConnections({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const {
    userData,
    connectionSource,
    academicYearLevel,
    setAcademicYearLevel,
    yearDetection,
    setYearDetection,
    connectedAt,
    lastSyncAt,
  } = useApp();

  const [showYearPicker, setShowYearPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const isFirstYear = academicYearLevel === 1;
  const needsAcademia = (academicYearLevel || 1) >= 2;
  const academiaConnected = connectionSource === "academia" || userData?.source === "academia";
  const portalConnected = connectionSource === "srm_portal" || userData?.portalConnected === true;

  const handleSetYear = useCallback(async (year: number) => {
    setLoading(true);
    try {
      const email = userData?.profile?.email || "";
      await fetchWithLoadBalancer("/portal/academic/set-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_email: email, academic_year_level: year }),
      });
      setAcademicYearLevel(year);
      setYearDetection({
        academicYearLevel: year,
        confidence: "high",
        detectionSource: "manual",
        needsUserConfirmation: false,
      });
      localStorage.setItem("classivo_academic_year", String(year));
      localStorage.setItem("classivo_year_detection", JSON.stringify({
        academicYearLevel: year,
        confidence: "high",
        detectionSource: "manual",
        needsUserConfirmation: false,
      }));
      setShowYearPicker(false);
      Haptics.selection();
    } catch (err) {
      console.error("Failed to set academic year:", err);
    } finally {
      setLoading(false);
    }
  }, [userData, setAcademicYearLevel, setYearDetection]);

  return (
    <div className="min-h-full pb-10" style={{ background: NOVA.bg }}>
      {/* Header */}
      <section className="px-5 pt-7">
        <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ ...mono(), color: NOVA.lime }}>
          connections
        </p>
        <h1 className="text-[30px] font-black tracking-tight mt-1.5" style={{ color: NOVA.text }}>
          Academic Connections
        </h1>
      </section>

      {/* Academic Year */}
      <section className="px-5 mt-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ ...mono(), color: NOVA.orange }}>
            academic year
          </span>
          <div className="flex-1 h-px" style={{ background: NOVA.border }} />
        </div>

        <button
          onClick={() => { Haptics.selection(); setShowYearPicker(true); }}
          className="w-full rounded-xl p-4 flex items-center justify-between"
          style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}` }}
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px]" style={{ color: NOVA.blue }}>school</span>
            <div className="text-left">
              <p className="text-[14px] font-black" style={{ color: NOVA.text }}>
                {academicYearLevel ? YEAR_LABELS[academicYearLevel] : "Not Set"}
              </p>
              {yearDetection && (
                <p className="text-[10px] font-semibold mt-0.5" style={{ color: NOVA.muted }}>
                  {yearDetection.confidence === "high" ? "Auto-detected" : "Manually set"} · {yearDetection.detectionSource}
                </p>
              )}
            </div>
          </div>
          <span className="material-symbols-outlined text-[18px]" style={{ color: NOVA.faint }}>chevron_right</span>
        </button>
      </section>

      {/* Year Picker Modal */}
      {showYearPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-[360px] rounded-xl p-6" style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}` }}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-4" style={{ ...mono(), color: NOVA.orange }}>
              select academic year
            </p>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((year) => (
                <button
                  key={year}
                  onClick={() => handleSetYear(year)}
                  disabled={loading}
                  className="w-full rounded-lg p-3 flex items-center gap-3 transition-all active:scale-[0.98]"
                  style={{
                    background: academicYearLevel === year ? NOVA.lime : NOVA.bg,
                    border: `1px solid ${academicYearLevel === year ? NOVA.lime : NOVA.border}`,
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]" style={{ color: academicYearLevel === year ? NOVA.ink : NOVA.blue }}>
                    {year === 1 ? "looks_one" : year === 2 ? "looks_two" : year === 3 ? "looks_3" : "looks_4"}
                  </span>
                  <span className="text-[13px] font-black" style={{ color: academicYearLevel === year ? NOVA.ink : NOVA.text }}>
                    {YEAR_LABELS[year]}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowYearPicker(false)}
              className="w-full mt-4 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest"
              style={{ ...mono(), color: NOVA.muted, border: `1px solid ${NOVA.border}` }}
            >
              cancel
            </button>
          </div>
        </div>
      )}

      {/* SRM Student Portal Connection */}
      <section className="px-5 mt-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ ...mono(), color: NOVA.blue }}>
            srm student portal
          </span>
          <div className="flex-1 h-px" style={{ background: NOVA.border }} />
        </div>

        <div className="rounded-xl p-4" style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${NOVA.blue}22` }}>
                <span className="material-symbols-outlined text-[16px]" style={{ color: NOVA.blue }}>shield</span>
              </div>
              <div>
                <p className="text-[13px] font-black" style={{ color: NOVA.text }}>SRM Student Portal</p>
                {portalConnected ? (
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: NOVA.lime }}>Connected</p>
                ) : (
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: NOVA.faint }}>Not Connected</p>
                )}
              </div>
            </div>
            {portalConnected && (
              <span className="material-symbols-outlined text-[20px]" style={{ color: NOVA.lime }}>check_circle</span>
            )}
          </div>

          {portalConnected && (
            <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: `1px solid ${NOVA.border}` }}>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ ...mono(), color: NOVA.muted }}>
                provides
              </p>
              {["Attendance", "Marks", "Academic Calendar", "Timetable"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[12px]" style={{ color: NOVA.lime }}>check</span>
                  <span className="text-[11px] font-semibold" style={{ color: NOVA.text }}>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Academia Connection */}
      <section className="px-5 mt-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ ...mono(), color: NOVA.purple }}>
            academia
          </span>
          <div className="flex-1 h-px" style={{ background: NOVA.border }} />
        </div>

        <div className="rounded-xl p-4" style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${NOVA.purple}22` }}>
                <span className="material-symbols-outlined text-[16px]" style={{ color: NOVA.purple }}>school</span>
              </div>
              <div>
                <p className="text-[13px] font-black" style={{ color: NOVA.text }}>Academia</p>
                {!needsAcademia ? (
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: NOVA.faint }}>
                    Not required for your current academic year
                  </p>
                ) : academiaConnected ? (
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: NOVA.lime }}>Connected</p>
                ) : (
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: NOVA.orange }}>Not Connected</p>
                )}
              </div>
            </div>
            {academiaConnected && (
              <span className="material-symbols-outlined text-[20px]" style={{ color: NOVA.lime }}>check_circle</span>
            )}
            {!needsAcademia && !academiaConnected && (
              <span className="material-symbols-outlined text-[20px]" style={{ color: NOVA.faint }}>remove_circle</span>
            )}
          </div>

          {needsAcademia && !academiaConnected && (
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${NOVA.border}` }}>
              <p className="text-[11px] font-semibold" style={{ color: NOVA.muted }}>
                Connect Academia to synchronize your timetable.
              </p>
              <button
                onClick={() => { Haptics.selection(); window.location.href = "/login"; }}
                className="mt-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest"
                style={{ ...mono(), background: NOVA.purple, color: NOVA.ink }}
              >
                Connect Academia
              </button>
            </div>
          )}

          {needsAcademia && academiaConnected && (
            <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: `1px solid ${NOVA.border}` }}>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ ...mono(), color: NOVA.muted }}>
                provides
              </p>
              {["Timetable", "Agenda"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[12px]" style={{ color: NOVA.lime }}>check</span>
                  <span className="text-[11px] font-semibold" style={{ color: NOVA.text }}>{item}</span>
                </div>
              ))}
            </div>
          )}

          {!needsAcademia && (
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${NOVA.border}` }}>
              <p className="text-[11px] font-semibold" style={{ color: NOVA.muted }}>
                First-year students use the SRM Student Portal for all academic data.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Summary */}
      <section className="px-5 mt-6">
        <div className="rounded-xl p-4" style={{ background: `${NOVA.lime}11`, border: `1px solid ${NOVA.lime}33` }}>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5" style={{ color: NOVA.lime }}>info</span>
            <div>
              <p className="text-[12px] font-bold" style={{ color: NOVA.text }}>
                {isFirstYear
                  ? "First-year: All data from SRM Student Portal"
                  : needsAcademia && portalConnected
                    ? "Second year+: All sources connected"
                    : needsAcademia && !portalConnected
                      ? "Connect SRM Portal for attendance & marks"
                      : "Second year+: Timetable from Academia"}
              </p>
              {lastSyncAt && (
                <p className="text-[10px] font-semibold mt-1" style={{ color: NOVA.muted }}>
                  Last synced: {new Date(lastSyncAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
