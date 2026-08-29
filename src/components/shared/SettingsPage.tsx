"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { requestNotificationPermission, subscribeToPushNotifications, sendNotification, syncNotificationData } from "@/utils/shared/notifs";
import { StudentProfile } from "@/types";
import { useApp } from "@/context/AppContext";
import { EncryptionUtils } from "@/utils/shared/Encryption";
import { ConnectionSource } from "@/types";
import CourseDetailsPage from "@/components/shared/CourseDetailsPage";
import { Haptics } from "@/utils/shared/haptics";
import { useRouter } from "next/navigation";
import { NOVA, mono, cap } from "@/components/themes/nova/tokens";

const backdropVariants: any = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.25 } },
};

const panelVariants: any = {
  hidden: { x: "100%" },
  visible: { x: "0%", transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { x: "100%", transition: { duration: 0.28, ease: "easeIn" } },
};

const sheetVariants: any = {
  hidden: { y: "100%" },
  visible: { y: 0, transition: { type: "spring", damping: 30, stiffness: 340 } },
  exit: { y: "100%", transition: { duration: 0.25, ease: "easeIn" } },
};

const Section = ({ n, label, children }: { n: string; label: string; children: React.ReactNode }) => (
  <section className="px-5">
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

interface SettingsPageProps {
  onBack: () => void;
  onLogout: () => void | Promise<void>;
  profile?: StudentProfile;
  onUpdateName?: (name: string) => void;
  onSelectTheme?: (id: string) => void;
  currentTheme?: string;
}

export default function SettingsPage({
  onBack,
  onLogout,
  profile,
}: SettingsPageProps) {
  const { userData, refreshData, isUpdating, connectionSource, lastSyncAt, connectedAt, disconnectAccount } = useApp();
  const router = useRouter();
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [showCourseDetails, setShowCourseDetails] = useState(false);
  const [showApkModal, setShowApkModal] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const apkUrl = process.env.NEXT_PUBLIC_APK_URL || "https://satisfaction-washington-mini-impressive.trycloudflare.com/classivo.apk";

  // Diagnostic states
  const [diagnosticState, setDiagnosticState] = useState<"idle" | "testing" | "success">("idle");

  useEffect(() => {
    const savedState = localStorage.getItem("notifs_enabled") === "true";
    setNotifEnabled(savedState);
  }, [profile]);

  useEffect(() => {
    if (notifEnabled) {
      try {
        subscribeToPushNotifications().catch(console.error);
      } catch (e) {
        console.error(e);
      }
    }
  }, [notifEnabled]);

  const handleNotificationToggle = async () => {
    Haptics.selection();
    if (!notifEnabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        alert("Notification permission denied by browser. Please enable notifications in your browser settings to receive alerts.");
        return;
      }

      const success = await subscribeToPushNotifications();
      if (success) {
        setNotifEnabled(true);
        localStorage.setItem("notifs_enabled", "true");
        if (userData) {
          await syncNotificationData(userData);
        }
      } else {
        alert("Failed to register push subscription. Make sure you are using a secure context (HTTPS) and that notifications are supported.");
      }
    } else {
      setNotifEnabled(false);
      localStorage.setItem("notifs_enabled", "false");
    }
  };

  const handleSync = async () => {
    Haptics.selection();
    const creds = EncryptionUtils.loadDecrypted("classivo_credentials");
    if (creds && userData) {
      try {
        await refreshData(creds, userData);
        Haptics.success();
        alert("Data sync completed successfully!");
      } catch (err) {
        Haptics.error();
        console.error("Sync failed", err);
      }
    }
  };

  const handleTestNotif = () => {
    Haptics.selection();
    setDiagnosticState("testing");
    setTimeout(() => {
      sendNotification("Classivo", "System handshake verification successful! 🎉");
      setDiagnosticState("success");
      setTimeout(() => {
        setDiagnosticState("idle");
      }, 2000);
    }, 1500);
  };

  const handleDisconnect = async () => {
    Haptics.warning();
    setDisconnecting(true);
    try {
      await disconnectAccount();
      Haptics.success();
      setShowDisconnectConfirm(false);
    } catch (err) {
      console.error("Disconnect failed", err);
    } finally {
      setDisconnecting(false);
    }
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
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + ", " +
           d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const sourceLabel = (source: ConnectionSource | null) => {
    if (source === "academia") return "Academia";
    if (source === "srm_portal") return "SRM Student Portal";
    return "Unknown";
  };

  return (
    <>
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onBack}
      />

      <motion.div
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 z-50 flex flex-col overflow-hidden select-none"
        style={{ background: NOVA.bg, color: NOVA.text }}
      >
        {/* Settings Header */}
        <header
          className="shrink-0 flex items-center justify-between px-5 h-14 z-50"
          style={{ borderBottom: `1px solid ${NOVA.border}` }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => { Haptics.selection(); onBack(); }}
              className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-all active:scale-90"
              style={{ border: `1px solid ${NOVA.border}`, background: NOVA.panel }}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ color: NOVA.lime }}>chevron_left</span>
            </button>
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ ...mono(), color: NOVA.orange }}>
                configuration
              </p>
              <h1 className="text-[20px] font-black tracking-tight leading-none mt-0.5" style={{ color: NOVA.text }}>
                Settings
              </h1>
            </div>
          </div>
          <span
            className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{ ...mono(), color: NOVA.ink, background: NOVA.orange }}
          >
            v2
          </span>
        </header>

        {/* Scrollable Panel */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-6 space-y-8">
          {/* 01 · Account */}
          <Section n="01" label="account">
            <div
              className="rounded-[12px] p-5"
              style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderLeft: `3px solid ${NOVA.lime}` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-widest" style={{ ...mono(), color: NOVA.faint }}>
                  student account
                </span>
                <span className="text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ ...mono(), color: NOVA.green }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: NOVA.green }} />
                  active
                </span>
              </div>
              <p className="text-[22px] font-black tracking-tight mt-2" style={{ color: NOVA.text }}>
                {profile?.name ? cap(profile.name) : "Student"}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{ ...mono(), color: NOVA.muted }}>
                {profile?.regNo || "—"}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span
                  className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded"
                  style={{ ...mono(), color: NOVA.lime, border: `1px solid ${NOVA.borderStrong}`, background: NOVA.bg }}
                >
                  {profile?.dept || "cs"}
                </span>
                <span
                  className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded"
                  style={{ ...mono(), color: NOVA.orange, border: `1px solid ${NOVA.borderStrong}`, background: NOVA.bg }}
                >
                  sem {profile?.semester || "—"}
                </span>
              </div>
            </div>
          </Section>

          {/* 02 · Utilities */}
          <Section n="02" label="utilities & preferences">
            <div className="grid grid-cols-2 gap-2.5">
              {/* Notifications Toggle */}
              <button
                onClick={handleNotificationToggle}
                className="rounded-[12px] p-4 text-left transition-all active:scale-95"
                style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderLeft: `3px solid ${NOVA.lime}` }}
              >
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${NOVA.lime}14`, border: `1px solid ${NOVA.lime}44` }}>
                    <span className="material-symbols-outlined text-[16px]" style={{ color: NOVA.lime }}>notifications</span>
                  </span>
                  <div
                    className="relative w-9 h-5 rounded-full transition-all duration-300"
                    style={{ background: notifEnabled ? NOVA.lime : NOVA.borderStrong }}
                  >
                    <motion.div
                      layout
                      className="absolute top-0.5 w-4 h-4 rounded-full"
                      style={{ background: notifEnabled ? "#0b0c10" : NOVA.faint, left: notifEnabled ? 18 : 2 }}
                      transition={{ type: "spring", stiffness: 450, damping: 28 }}
                    />
                  </div>
                </div>
                <p className="text-[13px] font-black tracking-tight mt-3" style={{ color: NOVA.text }}>
                  Notifications
                </p>
                <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ ...mono(), color: NOVA.faint }}>
                  real-time alerts
                </p>
              </button>

              {/* Sync Data */}
              <button
                onClick={handleSync}
                className="rounded-[12px] p-4 text-left transition-all active:scale-95"
                style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderLeft: `3px solid ${NOVA.blue}` }}
              >
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${NOVA.blue}14`, border: `1px solid ${NOVA.blue}44` }}>
                    <span className={`material-symbols-outlined text-[16px] ${isUpdating ? "animate-spin" : ""}`} style={{ color: NOVA.blue }}>sync</span>
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest" style={{ ...mono(), color: NOVA.faint }}>
                    {isUpdating ? "syncing…" : "now"}
                  </span>
                </div>
                <p className="text-[13px] font-black tracking-tight mt-3" style={{ color: NOVA.text }}>
                  Sync Data
                </p>
                <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ ...mono(), color: NOVA.faint }}>
                  update records
                </p>
              </button>

              {/* Syllabus Explorer */}
              <button
                onClick={() => { Haptics.selection(); setShowCourseDetails(true); }}
                className="rounded-[12px] p-4 text-left transition-all active:scale-95"
                style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderLeft: `3px solid ${NOVA.gold}` }}
              >
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${NOVA.gold}14`, border: `1px solid ${NOVA.gold}44` }}>
                  <span className="material-symbols-outlined text-[16px]" style={{ color: NOVA.gold }}>auto_stories</span>
                </span>
                <p className="text-[13px] font-black tracking-tight mt-3" style={{ color: NOVA.text }}>
                  Syllabus
                </p>
                <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ ...mono(), color: NOVA.faint }}>
                  explore curriculum
                </p>
              </button>

              {/* Get Android App */}
              <button
                onClick={() => { Haptics.selection(); setShowApkModal(true); }}
                className="rounded-[12px] p-4 text-left transition-all active:scale-95"
                style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderLeft: `3px solid ${NOVA.green}` }}
              >
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${NOVA.green}14`, border: `1px solid ${NOVA.green}44` }}>
                  <span className="material-symbols-outlined text-[16px]" style={{ color: NOVA.green }}>android</span>
                </span>
                <p className="text-[13px] font-black tracking-tight mt-3" style={{ color: NOVA.text }}>
                  Android App
                </p>
                <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ ...mono(), color: NOVA.faint }}>
                  download apk
                </p>
              </button>
            </div>

            {/* Developer */}
            <button
              onClick={() => { Haptics.selection(); onBack(); router.push("/developers"); }}
              className="w-full mt-2.5 rounded-[12px] p-4 text-left flex items-center justify-between transition-all active:scale-[0.98]"
              style={{ background: NOVA.panel, border: `1px dashed ${NOVA.borderStrong}`, borderLeft: `3px solid ${NOVA.blue}` }}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]" style={{ color: NOVA.blue }}>code</span>
                <div>
                  <p className="text-[13px] font-black tracking-tight" style={{ color: NOVA.text }}>Developer Options</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ ...mono(), color: NOVA.faint }}>
                    advanced tools & diagnostics
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[16px]" style={{ color: NOVA.faint }}>arrow_forward</span>
            </button>
          </Section>

          {/* 04 · Academic Account Connection */}
          <Section n="04" label="academic connection">
            <div
              className="rounded-[12px] p-5"
              style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderLeft: `3px solid ${connectionSource ? NOVA.green : NOVA.faint}` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-widest" style={{ ...mono(), color: NOVA.faint }}>
                  connection status
                </span>
                <span
                  className="text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5"
                  style={{ ...mono(), color: connectionSource ? NOVA.green : NOVA.faint }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: connectionSource ? NOVA.green : NOVA.faint }}
                  />
                  {connectionSource ? "connected" : "not connected"}
                </span>
              </div>

              {connectionSource ? (
                <>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold" style={{ color: NOVA.muted }}>Connected via</span>
                      <span
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded"
                        style={{ ...mono(), color: NOVA.blue, background: `${NOVA.blue}14`, border: `1px solid ${NOVA.blue}44` }}
                      >
                        {sourceLabel(connectionSource)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold" style={{ color: NOVA.muted }}>Last Sync</span>
                      <span className="text-[10px] font-bold" style={{ ...mono(), color: NOVA.text }}>
                        {formatSyncTime(lastSyncAt)}
                      </span>
                    </div>
                    {connectedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold" style={{ color: NOVA.muted }}>Connected</span>
                        <span className="text-[10px] font-bold" style={{ ...mono(), color: NOVA.text }}>
                          {new Date(connectedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => { Haptics.selection(); handleSync(); }}
                      disabled={isUpdating}
                      className="flex-1 py-3 rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                      style={{ background: NOVA.bg, border: `1px solid ${NOVA.borderStrong}`, color: NOVA.blue }}
                    >
                      {isUpdating ? "syncing..." : "sync now"}
                    </button>
                    <button
                      onClick={() => setShowDisconnectConfirm(true)}
                      className="py-3 px-4 rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                      style={{ background: "transparent", border: `1px solid ${NOVA.red}55`, color: NOVA.red }}
                    >
                      disconnect
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-3">
                  <p className="text-[11px] font-medium leading-relaxed" style={{ color: NOVA.muted }}>
                    No academic account is connected. Log in to Classivo to sync your attendance, marks, timetable, and courses.
                  </p>
                  <button
                    onClick={() => { Haptics.selection(); onLogout(); }}
                    className="w-full mt-3 py-3 rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                    style={{ background: NOVA.bg, border: `1px solid ${NOVA.borderStrong}`, color: NOVA.lime }}
                  >
                    connect account
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => { Haptics.selection(); onBack(); router.push("/connections"); }}
              className="w-full mt-3 rounded-[12px] p-4 text-left flex items-center justify-between transition-all active:scale-[0.98]"
              style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderLeft: `3px solid ${NOVA.lime}` }}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]" style={{ color: NOVA.lime }}>hub</span>
                <div>
                  <p className="text-[13px] font-black tracking-tight" style={{ color: NOVA.text }}>View Connections</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ ...mono(), color: NOVA.faint }}>
                    manage portal connections & data routing
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[16px]" style={{ color: NOVA.faint }}>arrow_forward</span>
            </button>
          </Section>

          {/* 05 · System */}
          <Section n="05" label="system">
            <button
              onClick={handleTestNotif}
              disabled={diagnosticState !== "idle"}
              className="w-full py-4 rounded-[12px] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{
                background: diagnosticState === "success" ? NOVA.green : "transparent",
                border: `1px solid ${diagnosticState === "success" ? NOVA.green : NOVA.borderStrong}`,
                color: diagnosticState === "success" ? NOVA.ink : NOVA.lime,
              }}
            >
              <span className="material-symbols-outlined text-[17px]">
                {diagnosticState === "testing" ? "sync" : diagnosticState === "success" ? "check_circle" : "send"}
              </span>
              <span className="text-[11px] font-black uppercase tracking-widest">
                {diagnosticState === "testing" ? "connecting…" : diagnosticState === "success" ? "sent successfully" : "test notification"}
              </span>
            </button>
            <p className="text-center text-[10px] font-bold uppercase tracking-wider px-8 mt-3 leading-relaxed" style={{ ...mono(), color: NOVA.faint }}>
              triggers a system handshake to verify your device is ready for critical academic updates.
            </p>

            <button
              onClick={() => { Haptics.warning(); onLogout(); }}
              className="w-full mt-4 py-4 rounded-[12px] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: "transparent", border: `1px solid ${NOVA.red}55`, color: NOVA.red }}
            >
              <span className="material-symbols-outlined text-[17px]">logout</span>
              <span className="text-[11px] font-black uppercase tracking-widest">log out</span>
            </button>
          </Section>

          {/* Footer */}
          <div className="px-5 pt-2 pb-8 text-center">
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ ...mono(), color: NOVA.faint }}>
              classivo v2 // srm institute of science &amp; technology
            </span>
          </div>
        </div>
      </motion.div>

      <CourseDetailsPage isOpen={showCourseDetails} onClose={() => setShowCourseDetails(false)} />

      {/* APK Install Guide Modal */}
      <AnimatePresence>
        {showApkModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
              onClick={() => setShowApkModal(false)}
            />
            <motion.div
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-[16px] overflow-hidden"
              style={{ background: NOVA.bg, border: `1px solid ${NOVA.border}` }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: NOVA.borderStrong }} />
              </div>

              <div className="px-5 pt-3 pb-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}` }}>
                    <span className="material-symbols-outlined text-[20px]" style={{ color: NOVA.green }}>android</span>
                  </div>
                  <div>
                    <h2 className="text-[18px] font-black tracking-tight" style={{ color: NOVA.text }}>Install Android App</h2>
                    <p className="text-[8px] font-black uppercase tracking-widest mt-0.5" style={{ ...mono(), color: NOVA.orange }}>classivo v2</p>
                  </div>
                </div>

                {/* Info Banner */}
                <div
                  className="rounded-[12px] p-4 mb-5 flex gap-3 items-start"
                  style={{ background: NOVA.panel, border: `1px solid ${NOVA.gold}44` }}
                >
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5" style={{ color: NOVA.gold }}>info</span>
                  <p className="text-[12px] font-semibold leading-relaxed" style={{ color: NOVA.text }}>
                    android will show a security warning. this is normal for apps outside the play store — just follow the steps below.
                  </p>
                </div>

                {/* Steps */}
                <div className="space-y-2.5 mb-6">
                  {[
                    { icon: "download", step: "01", label: "tap download apk below", sub: "the file will save to your downloads folder" },
                    { icon: "folder_open", step: "02", label: "open the downloaded file", sub: "find classivo.apk in your notifications or files app" },
                    { icon: "security", step: "03", label: 'tap "install anyway"', sub: "android shows this warning for all non-play-store apps" },
                    { icon: "check_circle", step: "04", label: "done! open classivo", sub: "find it on your home screen or app drawer" },
                  ].map(({ icon, step, label, sub }) => (
                    <div
                      key={step}
                      className="flex items-center gap-3 rounded-[12px] p-3"
                      style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}` }}
                    >
                      <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: NOVA.bg, border: `1px solid ${NOVA.borderStrong}` }}>
                        <span className="material-symbols-outlined text-[16px]" style={{ color: NOVA.lime }}>{icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-black tracking-tight truncate" style={{ color: NOVA.text }}>{cap(label)}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5 truncate" style={{ ...mono(), color: NOVA.faint }}>{sub}</p>
                      </div>
                      <span className="text-[9px] font-black whitespace-nowrap" style={{ ...mono(), color: NOVA.orange }}>{step}</span>
                    </div>
                  ))}
                </div>

                {/* Download Button */}
                <button
                  onClick={() => {
                    Haptics.success();
                    const a = document.createElement("a");
                    a.href = apkUrl;
                    a.download = "classivo.apk";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => setShowApkModal(false), 500);
                  }}
                  className="w-full py-4 rounded-[12px] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ background: NOVA.lime, color: NOVA.ink, boxShadow: `0 0 18px ${NOVA.lime}33` }}
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  <span className="text-[12px] font-black uppercase tracking-widest">download apk</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Disconnect Account Confirmation Modal */}
      <AnimatePresence>
        {showDisconnectConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
              onClick={() => !disconnecting && setShowDisconnectConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[61] flex items-center justify-center p-5"
            >
              <div
                className="w-full max-w-[360px] rounded-[16px] p-6"
                style={{ background: NOVA.bg, border: `1px solid ${NOVA.border}` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center"
                    style={{ background: `${NOVA.red}14`, border: `1px solid ${NOVA.red}44` }}
                  >
                    <span className="material-symbols-outlined text-[20px]" style={{ color: NOVA.red }}>link_off</span>
                  </div>
                  <div>
                    <h3 className="text-[16px] font-black tracking-tight" style={{ color: NOVA.text }}>
                      Disconnect Academic Account?
                    </h3>
                    <p className="text-[9px] font-black uppercase tracking-widest mt-0.5" style={{ ...mono(), color: NOVA.orange }}>
                      connection management
                    </p>
                  </div>
                </div>

                <div
                  className="rounded-[10px] p-4 mb-5"
                  style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}` }}
                >
                  <p className="text-[12px] font-medium leading-relaxed" style={{ color: NOVA.muted }}>
                    Classivo will no longer sync new academic information from your connected account.
                  </p>
                  <p className="text-[11px] font-medium leading-relaxed mt-2" style={{ color: NOVA.faint }}>
                    Previously synced data will be preserved in the app until you log out.
                  </p>
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setShowDisconnectConfirm(false)}
                    disabled={disconnecting}
                    className="flex-1 py-3.5 rounded-[10px] text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: NOVA.panel, border: `1px solid ${NOVA.borderStrong}`, color: NOVA.text }}
                  >
                    cancel
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="flex-1 py-3.5 rounded-[10px] text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: NOVA.red, color: NOVA.ink }}
                  >
                    {disconnecting ? "disconnecting..." : "disconnect"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
