"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NOVA, mono, cap, carbonGlass, glassCard, statusBadge, SPRINGS } from "./tokens";
import { Haptics } from "@/utils/shared/haptics";
import { useApp } from "@/context/AppContext";
import { fetchWithLoadBalancer } from "@/utils/backendProxy";
import { EncryptionUtils } from "@/utils/shared/Encryption";

const YEAR_LABELS = ["", "First Year", "Second Year", "Third Year", "Fourth Year"];

function formatTimestamp(isoStr: string | null) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return null;
  const dateFormatted = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFormatted = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateFormatted} at ${timeFormatted}`;
}

function formatRelativeTime(isoStr: string | null) {
  if (!isoStr) return "Not synced yet";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "Unknown";
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

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
    isUpdating,
    refreshData,
    disconnectAccount,
  } = useApp();

  const [showYearPicker, setShowYearPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const isFirstYear = academicYearLevel === 1;
  const needsAcademia = (academicYearLevel || 1) >= 2;
  const academiaConnected = connectionSource === "academia" || (userData as any)?.source === "academia" || (userData as any)?.hasAcademiaData === true;
  const portalConnected = connectionSource === "srm_portal" || (userData as any)?.portalConnected === true || (userData as any)?.hasPortalData === true;

  // Decrypted credentials username / registration number
  const linkedAccountIdentifier = useMemo(() => {
    const creds = EncryptionUtils.loadDecrypted("classivo_credentials");
    const p = (userData?.profile || {}) as any;
    return (
      creds?.username ||
      creds?.email ||
      p?.email ||
      p?.regNo ||
      p?.regNum ||
      p?.registerNumber ||
      "Student Account"
    );
  }, [userData]);

  const studentProfile = (userData?.profile || {}) as any;
  const studentName = studentProfile?.name || "Student";
  const studentRegNum = studentProfile?.regNo || studentProfile?.regNum || studentProfile?.registerNumber || "";

  const formattedConnectedTime = useMemo(() => formatTimestamp(connectedAt), [connectedAt]);
  const formattedSyncTime = useMemo(() => formatTimestamp(lastSyncAt), [lastSyncAt]);
  const relativeSyncTime = useMemo(() => formatRelativeTime(lastSyncAt), [lastSyncAt]);
  const relativeConnectedTime = useMemo(() => formatRelativeTime(connectedAt), [connectedAt]);

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

  const handleManualSync = async () => {
    Haptics.selection();
    const creds = EncryptionUtils.loadDecrypted("classivo_credentials");
    if (creds && userData) {
      await refreshData(creds, userData);
    }
  };

  return (
    <div className="min-h-full pb-16 relative overflow-hidden" style={{ background: NOVA.bg }}>
      {/* Background ambient lighting */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[450px] h-[240px] rounded-full pointer-events-none opacity-20 blur-[130px]" style={{ background: NOVA.blue }} />

      {/* Header */}
      <section className="px-5 pt-7 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ ...mono(), color: NOVA.blue }}>
              data &amp; integrations
            </p>
            <h1 className="text-[32px] font-black tracking-tight mt-1" style={{ color: NOVA.text }}>
              Connections
            </h1>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isUpdating}
            className="px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: "rgba(56, 189, 248, 0.12)",
              border: `1px solid ${NOVA.blue}44`,
              color: NOVA.blue,
              boxShadow: `0 0 16px ${NOVA.blue}20`,
            }}
          >
            <span className={`material-symbols-outlined text-[15px] ${isUpdating ? "animate-spin" : ""}`}>
              sync
            </span>
            <span>{isUpdating ? "Syncing..." : "Sync Now"}</span>
          </button>
        </div>
      </section>

      {/* Connected Student Identity Hero Card */}
      <section className="px-5 mt-5 relative z-10">
        <div
          className="rounded-2xl p-5 relative overflow-hidden backdrop-blur-2xl transition-all"
          style={carbonGlass(NOVA.cyan, "40")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: NOVA.lime, boxShadow: `0 0 10px ${NOVA.lime}` }} />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ ...mono(), color: NOVA.lime }}>
                Active Student Account
              </span>
            </div>
            <span
              className="text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full"
              style={{ ...mono(), ...statusBadge(NOVA.cyan, false) }}
            >
              Verified
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-[18px] shrink-0 shadow-lg"
              style={{ background: `linear-gradient(135deg, ${NOVA.cyan}33 0%, ${NOVA.blue}22 100%)`, border: `1px solid ${NOVA.cyan}55`, color: NOVA.cyan }}
            >
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[17px] font-black tracking-tight truncate" style={{ color: NOVA.text }}>
                {studentName}
              </h3>
              <p className="text-[11px] font-mono font-bold mt-0.5 truncate" style={{ color: NOVA.blue }}>
                {linkedAccountIdentifier} {studentRegNum && studentRegNum !== linkedAccountIdentifier ? `· ${studentRegNum}` : ""}
              </p>
            </div>
          </div>

          {/* Sync & Connection Timestamps */}
          <div className="mt-4 pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px]" style={{ borderColor: NOVA.border }}>
            <div className="flex items-center gap-1.5" style={{ color: NOVA.muted }}>
              <span className="material-symbols-outlined text-[13px]" style={{ color: NOVA.lime }}>link</span>
              <span>Linked:</span>
              <span className="font-semibold text-white" style={{ ...mono() }}>
                {formattedConnectedTime || relativeConnectedTime || "Active Session"}
              </span>
            </div>

            <div className="flex items-center gap-1.5" style={{ color: NOVA.muted }}>
              <span className="material-symbols-outlined text-[13px]" style={{ color: NOVA.cyan }}>schedule</span>
              <span>Last Sync:</span>
              <span className="font-semibold text-white" style={{ ...mono() }}>
                {formattedSyncTime || relativeSyncTime}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Academic Year Level */}
      <section className="px-5 mt-6 relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ ...mono(), color: NOVA.orange }}>
            01 · academic year level
          </span>
          <div className="flex-1 h-px" style={{ background: NOVA.border }} />
        </div>

        <button
          onClick={() => { Haptics.selection(); setShowYearPicker(true); }}
          className="w-full rounded-2xl p-4 flex items-center justify-between transition-all active:scale-[0.99]"
          style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}` }}
        >
          <div className="flex items-center gap-3.5">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${NOVA.orange}20`, border: `1px solid ${NOVA.orange}44` }}>
              <span className="material-symbols-outlined text-[20px]" style={{ color: NOVA.orange }}>school</span>
            </span>
            <div className="text-left min-w-0">
              <p className="text-[14px] font-black" style={{ color: NOVA.text }}>
                {academicYearLevel ? YEAR_LABELS[academicYearLevel] : "Not Set"}
              </p>
              {yearDetection && (
                <p className="text-[10px] font-bold mt-0.5" style={{ ...mono(), color: NOVA.muted }}>
                  {yearDetection.confidence === "high" ? "Auto-detected" : "Manually set"} · {yearDetection.detectionSource}
                </p>
              )}
            </div>
          </div>
          <span className="material-symbols-outlined text-[20px]" style={{ color: NOVA.faint }}>chevron_right</span>
        </button>
      </section>

      {/* SRM Student Portal Connection Card */}
      <section className="px-5 mt-6 relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ ...mono(), color: NOVA.blue }}>
            02 · srm student portal
          </span>
          <div className="flex-1 h-px" style={{ background: NOVA.border }} />
        </div>

        <div
          className="rounded-2xl p-4.5 transition-all relative overflow-hidden backdrop-blur-2xl"
          style={{
            ...carbonGlass(portalConnected ? NOVA.lime : NOVA.orange, "30"),
            borderLeft: `4px solid ${portalConnected ? NOVA.lime : NOVA.orange}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                style={{
                  background: portalConnected ? `${NOVA.lime}22` : `${NOVA.orange}22`,
                  border: `1px solid ${portalConnected ? NOVA.lime : NOVA.orange}55`,
                }}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ color: portalConnected ? NOVA.lime : NOVA.orange }}>
                  shield
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-[14px] font-black tracking-tight" style={{ color: NOVA.text }}>
                    SRM Student Portal
                  </h4>
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ ...mono(), ...statusBadge(portalConnected ? NOVA.lime : NOVA.orange, true) }}
                  >
                    {portalConnected ? "Connected & Active" : "Not Linked"}
                  </span>
                </div>
              </div>
            </div>

            {portalConnected && (
              <span className="material-symbols-outlined text-[24px]" style={{ color: NOVA.lime }}>
                check_circle
              </span>
            )}
          </div>

          {/* Connection Timestamps */}
          {portalConnected && (
            <div className="mt-3.5 pt-3 border-t space-y-1 text-[10.5px]" style={{ borderColor: NOVA.border }}>
              <div className="flex items-center justify-between">
                <span style={{ color: NOVA.muted }}>Linked Credential:</span>
                <span className="font-mono font-bold text-white truncate max-w-[200px]">{linkedAccountIdentifier}</span>
              </div>

              {formattedConnectedTime && (
                <div className="flex items-center justify-between">
                  <span style={{ color: NOVA.muted }}>Linked Date:</span>
                  <span className="font-semibold text-white" style={{ ...mono() }}>{formattedConnectedTime}</span>
                </div>
              )}

              {formattedSyncTime && (
                <div className="flex items-center justify-between">
                  <span style={{ color: NOVA.muted }}>Last Data Sync:</span>
                  <span className="font-semibold text-white" style={{ ...mono() }}>{formattedSyncTime} ({relativeSyncTime})</span>
                </div>
              )}
            </div>
          )}

          {/* Datasets synchronized */}
          {portalConnected && (
            <div className="mt-3 pt-3 border-t space-y-1.5" style={{ borderColor: NOVA.border }}>
              <p className="text-[9px] font-black uppercase tracking-widest" style={{ ...mono(), color: NOVA.faint }}>
                Synchronized Datasets
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { name: "Attendance Records", icon: "analytics" },
                  { name: "Internal Marks", icon: "auto_stories" },
                  { name: "Academic Calendar", icon: "calendar_month" },
                  { name: "Timetable & Slots", icon: "schedule" },
                ].map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: NOVA.text }}>
                    <span className="material-symbols-outlined text-[13px]" style={{ color: NOVA.lime }}>check_circle</span>
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Academia Connection Card */}
      <section className="px-5 mt-6 relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ ...mono(), color: NOVA.purple }}>
            03 · academia portal
          </span>
          <div className="flex-1 h-px" style={{ background: NOVA.border }} />
        </div>

        <div
          className="rounded-2xl p-4.5 transition-all relative overflow-hidden backdrop-blur-2xl"
          style={{
            ...carbonGlass(academiaConnected ? NOVA.purple : NOVA.faint, "30"),
            borderLeft: `4px solid ${academiaConnected ? NOVA.purple : NOVA.faint}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                style={{
                  background: `${NOVA.purple}22`,
                  border: `1px solid ${NOVA.purple}55`,
                }}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ color: NOVA.purple }}>
                  school
                </span>
              </div>
              <div>
                <h4 className="text-[14px] font-black tracking-tight" style={{ color: NOVA.text }}>
                  SRM Academia
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  {!needsAcademia ? (
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ ...mono(), color: NOVA.faint, background: `${NOVA.faint}20` }}>
                      1st Year (Not Required)
                    </span>
                  ) : academiaConnected ? (
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ ...mono(), ...statusBadge(NOVA.purple, true) }}>
                      Connected &amp; Active
                    </span>
                  ) : (
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ ...mono(), ...statusBadge(NOVA.orange, false) }}>
                      Not Connected
                    </span>
                  )}
                </div>
              </div>
            </div>

            {academiaConnected && (
              <span className="material-symbols-outlined text-[24px]" style={{ color: NOVA.purple }}>
                check_circle
              </span>
            )}
          </div>

          {!needsAcademia && (
            <div className="mt-3 pt-3 border-t text-[11px] font-medium" style={{ borderColor: NOVA.border, color: NOVA.muted }}>
              First-year students receive all attendance, marks, and timetable updates directly from the SRM Student Portal.
            </div>
          )}

          {needsAcademia && !academiaConnected && (
            <div className="mt-3 pt-3 border-t text-[11px] font-medium" style={{ borderColor: NOVA.border }}>
              <p style={{ color: NOVA.muted }}>
                Connect your Academia credentials to synchronize secondary timetable schedules.
              </p>
              <button
                onClick={() => { Haptics.selection(); window.location.href = "/login"; }}
                className="mt-2.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                style={{ ...mono(), background: NOVA.purple, color: NOVA.ink }}
              >
                Connect Academia Account
              </button>
            </div>
          )}

          {needsAcademia && academiaConnected && (
            <div className="mt-3 pt-3 border-t space-y-1.5 text-[11px]" style={{ borderColor: NOVA.border }}>
              <div className="flex items-center justify-between text-[10.5px]">
                <span style={{ color: NOVA.muted }}>Status:</span>
                <span className="font-semibold text-white" style={{ ...mono() }}>Secondary Provider Active</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Year Picker Modal */}
      <AnimatePresence>
        {showYearPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5 backdrop-blur-md" style={{ background: "rgba(0,0,0,0.7)" }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[360px] rounded-2xl p-6 relative"
              style={{ background: NOVA.panelSolid, border: `1px solid ${NOVA.borderStrong}` }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-4" style={{ ...mono(), color: NOVA.orange }}>
                Select Academic Year
              </p>
              <div className="space-y-2">
                {[1, 2, 3, 4].map((year) => (
                  <button
                    key={year}
                    onClick={() => handleSetYear(year)}
                    disabled={loading}
                    className="w-full rounded-xl p-3.5 flex items-center gap-3 transition-all active:scale-[0.98]"
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
                className="w-full mt-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest"
                style={{ ...mono(), color: NOVA.muted, border: `1px solid ${NOVA.border}` }}
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
