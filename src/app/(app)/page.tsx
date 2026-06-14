"use client";
import React, { useState, useCallback, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import dynamic from "next/dynamic";
import { useAcademiaData } from "@/hooks/useAcademiaData";
import { useAppLayout } from "@/context/AppLayoutContext";
import { EncryptionUtils } from "@/utils/shared/Encryption";
import { Shield, Key, Lock, ArrowRight, ServerCrash, Cpu } from "lucide-react";
import { useRouter } from "next/navigation";

const DashboardMinimalist = dynamic(() => import("@/components/themes/minimalist/dashboard/Dashboard"), { ssr: false });

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const { userData } = useApp();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!userData) {
    return <LandingPage />;
  }

  return <DashboardContent />;
}

function DashboardContent() {
  const { userData, customDisplayName, refreshData, isUpdating } = useApp();
  const { onOpenSettings } = useAppLayout();
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const academia = useAcademiaData(userData as any);

  const handleRefresh = useCallback(async () => {
    const creds = EncryptionUtils.loadDecrypted("classivo_credentials");
    if (creds && userData) {
      await refreshData(creds, userData);
    }
  }, [userData, refreshData]);

  return (
    <DashboardMinimalist 
      data={userData as any}
      academia={academia}
      onOpenSettings={onOpenSettings}
      isAlertsOpen={isAlertsOpen}
      setIsAlertsOpen={setIsAlertsOpen}
      startEntrance={true}
      onRefresh={handleRefresh}
      isRefreshing={isUpdating}
    />
  );
}

function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen text-[#dfe1f4] flex flex-col justify-between p-6 font-sans relative overflow-hidden select-none bg-[#050814]">
      {/* Ambient background glows */}
      <div className="absolute top-[-15%] right-[-10%] w-[60vw] h-[45vh] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[40vh] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="flex justify-between items-center py-4 px-2 max-w-4xl mx-auto w-full relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-r from-cyan-400 to-violet-500 animate-pulse">
            <span className="material-symbols-outlined text-[16px] text-[#0a0d17] font-black">diamond</span>
          </div>
          <span className="text-xl font-black text-white lowercase tracking-tight">classivo</span>
        </div>
        
        <button
          onClick={() => router.push("/login")}
          className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all text-white"
        >
          sign in
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center max-w-3xl mx-auto w-full py-12 px-4 relative z-10">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/25 rounded-full text-cyan-400 text-[10px] font-bold uppercase tracking-wider mb-6 animate-pulse">
          <Shield size={10} /> Privacy-First Academic Portal
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight tracking-tight lowercase mb-6">
          re-imagining your <br/>
          <span className="bg-gradient-to-r from-cyan-300 via-indigo-200 to-violet-400 bg-clip-text text-transparent">
            academic experience
          </span>
        </h1>

        {/* Slogan */}
        <p className="text-[14px] sm:text-base text-white/50 max-w-xl leading-relaxed mb-8 font-medium">
          classivo provides a modern, fast, and completely secure client portal for your academia grades, attendance, and timetables. designed with premium aesthetics and absolute data ownership.
        </p>

        {/* Primary Action Button */}
        <button
          onClick={() => router.push("/login")}
          className="group px-8 py-4 rounded-2xl text-[14px] font-black uppercase tracking-widest bg-white text-[#050814] flex items-center gap-2 hover:bg-white/95 active:scale-[0.98] transition-all shadow-[0_8px_30px_rgba(255,255,255,0.08)] mb-16 animate-bounce"
        >
          get started
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Security Feature Grid */}
        <div className="w-full space-y-4 text-left">
          <div className="flex items-center gap-2 px-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#6EE7F7] whitespace-nowrap">
              security & privacy architecture
            </span>
            <div className="flex-1 h-[1.5px] bg-[#6EE7F7]/15 rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: <Lock className="text-cyan-400 w-5 h-5" />,
                title: "Local AES-256 Encryption",
                desc: "All your credentials and academic history are encrypted directly on your device using a custom cryptographic key generated specifically for your browser."
              },
              {
                icon: <ServerCrash className="text-indigo-400 w-5 h-5" />,
                title: "Zero Database Storage",
                desc: "We do not host databases of student credentials, passwords, or grades. Your personal information stays 100% on your local storage and web client."
              },
              {
                icon: <Cpu className="text-violet-400 w-5 h-5" />,
                title: "Direct Secure Sync",
                desc: "The client establishes secure direct communication with the official university server via end-to-end encryption. Captcha validation is isolated locally."
              },
              {
                icon: <Shield className="text-emerald-400 w-5 h-5" />,
                title: "Auditable Transparency",
                desc: "Designed to run purely client-side without hidden telemetry or data scraping, ensuring that your student records belong strictly to you."
              }
            ].map(({ icon, title, desc }) => (
              <div 
                key={title}
                className="glass-panel p-5 rounded-2xl border border-white/5 text-left relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:border-white/10"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                    {icon}
                  </div>
                  <h3 className="text-[14px] font-extrabold text-white lowercase tracking-tight">
                    {title.toLowerCase()}
                  </h3>
                </div>
                <p className="text-[12px] text-white/45 leading-relaxed font-medium">
                  {desc.toLowerCase()}
                </p>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-6 px-2 text-center relative z-10 border-t border-white/5 max-w-4xl mx-auto w-full mt-12">
        <span className="font-mono text-[9px] font-bold text-white/25 uppercase tracking-widest">
          classivo // srm institute of science & technology companion
        </span>
      </footer>

    </div>
  );
}
