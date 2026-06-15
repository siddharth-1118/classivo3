"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { requestNotificationPermission, subscribeToPushNotifications, sendNotification } from "@/utils/shared/notifs";
import { StudentProfile } from "@/types";
import { useApp } from "@/context/AppContext";
import { EncryptionUtils } from "@/utils/shared/Encryption";
import CourseDetailsPage from "@/components/shared/CourseDetailsPage";

import { Haptics } from "@/utils/shared/haptics";

const backdropVariants: any = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.25 } },
};

const panelVariants: any = {
  hidden: { x: "100%" },
  visible: { x: "0%", transition: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] } },
  exit: { x: "100%", transition: { duration: 0.3, ease: "easeIn" } },
};

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
  const { userData, refreshData, isUpdating } = useApp();
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [showCourseDetails, setShowCourseDetails] = useState(false);
  const [showApkModal, setShowApkModal] = useState(false);
  const apkUrl = process.env.NEXT_PUBLIC_APK_URL || "/classivo.apk";

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

  const handleNotificationToggle = () => {
    Haptics.selection();
    setNotifEnabled(prev => {
      const next = !prev;
      localStorage.setItem("notifs_enabled", next.toString());
      return next;
    });
  };

  const handleSync = async () => {
    Haptics.selection();
    const creds = EncryptionUtils.loadDecrypted("classivo_credentials");
    if (creds && userData) {
      try {
        await refreshData(creds, userData);
        Haptics.success();
        alert("Portal sync completed successfully!");
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
        className="fixed inset-0 z-50 bg-[#0f131f] text-[#dfe1f4] flex flex-col overflow-hidden font-body-lg select-none"
      >
        {/* Settings Header */}
        <header className="pt-16 px-6 pb-4 flex justify-between items-end shrink-0 border-b border-outline-variant/10 bg-slate-950/20">
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#6EE7F7]">Configuration</span>
            <h1 className="text-3xl font-black lowercase tracking-tighter mt-1 bg-gradient-to-r from-white via-white to-cyan-200 bg-clip-text text-transparent">settings</h1>
          </div>
          <button 
            onClick={() => { Haptics.selection(); onBack(); }} 
            className="w-11 h-11 rounded-full bg-slate-900 border border-outline-variant/10 flex items-center justify-center active:scale-90 transition-transform shadow-md"
          >
            <span className="material-symbols-outlined text-[#EEF2FF]">chevron_left</span>
          </button>
        </header>

        {/* Scrollable Panel */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-6 space-y-8">
          
          {/* User Profile Banner — no avatar */}
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="rounded-2xl p-5 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(110,231,247,0.08) 0%, rgba(129,140,248,0.08) 100%)",
                border: "1px solid rgba(110,231,247,0.15)",
              }}>
              {/* Glow orbs */}
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-cyan-400/8 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-indigo-400/8 rounded-full blur-2xl pointer-events-none" />

              {/* Top label */}
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-cyan-400/60 mb-3">Student Account</p>

              {/* Name & Reg */}
              <h2 className="text-[22px] font-black text-white lowercase tracking-tight leading-none">
                {profile?.name ? profile.name.toLowerCase() : "Student"}
              </h2>
              <p className="text-[11px] font-bold text-cyan-300/60 tracking-widest uppercase mt-1">
                {profile?.regNo || "—"}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider"
                  style={{ background: "rgba(110,231,247,0.1)", color: "#6ee7f7", border: "1px solid rgba(110,231,247,0.2)" }}>
                  {profile?.dept || "CS"}
                </span>
                <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider"
                  style={{ background: "rgba(129,140,248,0.1)", color: "#818cf8", border: "1px solid rgba(129,140,248,0.2)" }}>
                  sem {profile?.semester || "—"}
                </span>
              </div>

              {/* Active dot */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-wider">active</span>
              </div>
            </div>
          </section>


          {/* Setting Cards: 2x2 Grid */}
          <section className="space-y-4">
            <h3 className="font-label-caps text-[11px] font-bold text-on-surface-variant uppercase tracking-widest ml-1 text-left">Utilities &amp; Preferences</h3>
            <div className="grid grid-cols-2 gap-4">
              
              {/* Notifications Toggle */}
              <div 
                onClick={handleNotificationToggle}
                className="glass-panel rounded-xl p-4 flex flex-col justify-between h-40 hover:border-primary-container/30 border border-outline-variant/10 transition-all cursor-pointer group shadow-sm text-left"
              >
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-primary-container/10 rounded-lg group-hover:bg-primary-container/20 transition-colors text-primary-container">
                    <span className="material-symbols-outlined">notifications</span>
                  </div>
                  
                  {/* Custom Toggle Switch */}
                  <div className="relative inline-flex items-center cursor-pointer">
                    <div 
                      className={`w-10 h-5.5 rounded-full relative transition-all duration-300 shadow-sm border border-white/5`}
                      style={{ background: notifEnabled ? 'var(--primary-container)' : 'rgba(255,255,255,0.06)' }}
                    >
                      <motion.div 
                        layout 
                        className="absolute top-0.5 w-[16px] h-[16px] rounded-full bg-white shadow-md"
                        style={{ left: notifEnabled ? '20px' : '2px' }}
                        transition={{ type: "spring", stiffness: 450, damping: 28 }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-title-md text-[16px] font-black text-on-surface">Notifications</h4>
                  <p className="font-body-sm text-[12px] text-on-surface-variant font-medium mt-0.5">Real-time alerts</p>
                </div>
              </div>

              {/* Sync Data Button */}
              <div 
                onClick={handleSync}
                className="glass-panel rounded-xl p-4 flex flex-col justify-between h-40 hover:border-primary-container/30 border border-outline-variant/10 transition-all cursor-pointer group shadow-sm text-left"
              >
                <div className="p-2 bg-secondary-container/10 w-fit rounded-lg group-hover:bg-secondary-container/20 transition-colors text-secondary">
                  <span className="material-symbols-outlined">sync</span>
                </div>
                <div>
                  <h4 className="font-title-md text-[16px] font-black text-on-surface">Sync Data</h4>
                  <p className="font-body-sm text-[12px] text-on-surface-variant font-medium mt-0.5">Update records</p>
                </div>
              </div>

              {/* Syllabus Explorer */}
              <div 
                onClick={() => { Haptics.selection(); setShowCourseDetails(true); }}
                className="glass-panel rounded-xl p-4 flex flex-col justify-between h-40 hover:border-primary-container/30 border border-outline-variant/10 transition-all cursor-pointer group shadow-sm text-left"
              >
                <div className="p-2 bg-tertiary-container/10 w-fit rounded-lg group-hover:bg-tertiary-container/20 transition-colors text-[#ffd061]">
                  <span className="material-symbols-outlined">auto_stories</span>
                </div>
                <div>
                  <h4 className="font-title-md text-[16px] font-black text-on-surface">Syllabus</h4>
                  <p className="font-body-sm text-[12px] text-on-surface-variant font-medium mt-0.5">Explore curriculum</p>
                </div>
              </div>

              {/* Get Android App */}
              <div 
                onClick={() => { Haptics.selection(); setShowApkModal(true); }}
                className="glass-panel rounded-xl p-4 flex flex-col justify-between h-40 hover:border-primary-container/30 border border-outline-variant/10 transition-all cursor-pointer group shadow-sm text-left"
              >
                <div className="p-2 bg-cyan-400/10 w-fit rounded-lg group-hover:bg-cyan-400/20 transition-colors text-cyan-300">
                  <span className="material-symbols-outlined">android</span>
                </div>
                <div>
                  <h4 className="font-title-md text-[16px] font-black text-on-surface">Get Android App</h4>
                  <p className="font-body-sm text-[12px] text-on-surface-variant font-medium mt-0.5">Download APK</p>
                </div>
              </div>

            </div>
          </section>

          {/* Test Notification Action */}
          <section className="space-y-4">
            <button 
              onClick={handleTestNotif}
              disabled={diagnosticState !== "idle"}
              className={`w-full font-title-md text-[16px] font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(110,231,247,0.15)] active:scale-95 transition-all text-background border border-primary-container/20 ${
                diagnosticState === "success" 
                  ? "bg-[#22C55E] text-white" 
                  : "bg-primary-container text-background"
              }`}
            >
              <span className="material-symbols-outlined">
                {diagnosticState === "testing" ? "sync" : diagnosticState === "success" ? "check_circle" : "send"}
              </span>
              <span>
                {diagnosticState === "testing" ? "Connecting..." : diagnosticState === "success" ? "Sent Successfully" : "Test Notification"}
              </span>
            </button>
            <p className="text-center font-body-sm text-[12px] text-on-surface-variant px-8 leading-relaxed font-semibold">
              This will trigger a system handshake to verify your device is ready for critical academic updates.
            </p>
          </section>

          {/* Logout Action */}
          <section className="pb-8">
            <button 
              onClick={() => { Haptics.warning(); onLogout(); }}
              className="w-full border border-alert-rose/30 bg-alert-rose/5 text-alert-rose font-title-md text-[16px] font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-alert-rose/10 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined">logout</span>
              Log Out
            </button>
            <div className="text-center mt-6">
              <span className="font-label-caps text-[9px] font-bold text-on-surface-variant opacity-45 uppercase tracking-widest">
                v1.4.0-stable // SRM Institute of Science and Technology
              </span>
            </div>
          </section>
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
              initial={{ y: "100%" }}
              animate={{ y: 0, transition: { type: "spring", damping: 28, stiffness: 350 } }}
              exit={{ y: "100%", transition: { duration: 0.25, ease: "easeIn" } }}
              className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl overflow-hidden"
              style={{ background: "#0f131f", border: "1px solid rgba(110,231,247,0.12)" }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              <div className="px-6 pt-3 pb-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 rounded-2xl bg-cyan-400/10">
                    <span className="material-symbols-outlined text-cyan-300 text-[28px]">android</span>
                  </div>
                  <div>
                    <h2 className="text-[20px] font-black text-white">Install Android App</h2>
                    <p className="text-[11px] text-cyan-400/60 font-bold uppercase tracking-widest">Classivo v1.4.0</p>
                  </div>
                </div>

                {/* Info Banner */}
                <div className="rounded-2xl p-4 mb-5 flex gap-3 items-start"
                  style={{ background: "rgba(250,204,21,0.07)", border: "1px solid rgba(250,204,21,0.2)" }}>
                  <span className="material-symbols-outlined text-yellow-400 text-[20px] shrink-0 mt-0.5">info</span>
                  <p className="text-[13px] text-yellow-200/80 font-semibold leading-relaxed">
                    Android will show a security warning. This is normal for apps outside the Play Store — just follow the steps below.
                  </p>
                </div>

                {/* Steps */}
                <div className="space-y-3 mb-6">
                  {[
                    { icon: "download", step: "1", label: "Tap \"Download APK\" below", sub: "The file will save to your Downloads folder" },
                    { icon: "folder_open", step: "2", label: "Open the downloaded file", sub: "Find classivo.apk in your notifications or Files app" },
                    { icon: "security", step: "3", label: 'Tap \"Install anyway\"\'', sub: "Android shows this warning for all non-Play Store apps" },
                    { icon: "check_circle", step: "4", label: "Done! Open Classivo", sub: "Find it on your home screen or app drawer" },
                  ].map(({ icon, step, label, sub }) => (
                    <div key={step} className="flex items-center gap-3 rounded-xl p-3"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="w-8 h-8 rounded-full bg-cyan-400/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-cyan-300 text-[16px]">{icon}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-black text-white">{label}</p>
                        <p className="text-[11px] text-white/40 font-medium mt-0.5">{sub}</p>
                      </div>
                      <span className="text-[10px] font-black text-white/20 uppercase">Step {step}</span>
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
                  className="w-full py-4 rounded-2xl font-black text-[16px] flex items-center justify-center gap-2 active:scale-95 transition-all"
                  style={{
                    background: "linear-gradient(135deg, #22d3ee 0%, #818cf8 100%)",
                    color: "#0f131f",
                    boxShadow: "0 4px 24px rgba(34,211,238,0.25)"
                  }}
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  Download APK
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
