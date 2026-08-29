"use client";
import React, { useState, useCallback, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import dynamic from "next/dynamic";
import { useAcademiaData } from "@/hooks/useAcademiaData";
import { useAppLayout } from "@/context/AppLayoutContext";
import { EncryptionUtils } from "@/utils/shared/Encryption";
import { Shield, Key, Lock, ArrowRight, ServerCrash, Cpu, BarChart2, Clock, Layers, BookOpen, Search, Smartphone, Star, Users, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

const DashboardMinimalist = dynamic(() => import("@/components/themes/minimalist/dashboard/Dashboard"), { ssr: false });
import NovaDashboard from "@/components/themes/nova/NovaDashboard";
import NovaLanding from "@/components/themes/nova/NovaLanding";
import { useTheme } from "@/context/ThemeContext";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const { userData } = useApp();
  const { uiStyle } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!userData) {
    return uiStyle === "nova" ? <NovaLanding /> : <LandingPage />;
  }

  return <DashboardContent />;
}

function DashboardContent() {
  const { userData, customDisplayName, refreshData, isUpdating } = useApp();
  const { onOpenSettings } = useAppLayout();
  const { uiStyle } = useTheme();
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const academia = useAcademiaData(userData as any);

  const handleRefresh = useCallback(async () => {
    const creds = EncryptionUtils.loadDecrypted("classivo_credentials");
    if (creds && userData) {
      await refreshData(creds, userData);
    }
  }, [userData, refreshData]);

  if (uiStyle === "nova") {
    return (
      <NovaDashboard
        data={userData as any}
        academia={academia as any}
        onOpenSettings={onOpenSettings}
      />
    );
  }

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

  const features = [
    {
      icon: <BarChart2 className="w-5 h-5 text-cyan-400" />,
      title: "Smart Attendance Tracker",
      desc: "Real-time attendance percentages, skip predictions, and safe-to-skip class counts — all calculated instantly from your live SRMIST data.",
      color: "cyan",
    },
    {
      icon: <BarChart2 className="w-5 h-5 text-violet-400" />,
      title: "Marks & SGPA Simulator",
      desc: "View your internals, adjust expected exam scores with sliders, and watch your projected SGPA update in real-time before results are out.",
      color: "violet",
    },
    {
      icon: <Clock className="w-5 h-5 text-indigo-400" />,
      title: "Smart Timetable",
      desc: "See today's class schedule with live current-class indicators, slot codes, room numbers, and faculty names. Download your full timetable as an image.",
      color: "indigo",
    },
    {
      icon: <BookOpen className="w-5 h-5 text-emerald-400" />,
      title: "Academic Calendar",
      desc: "Full semester calendar with day orders, holidays, exam weeks, and working days — all synced with the official SRM academic planner.",
      color: "emerald",
    },
    {
      icon: <Search className="w-5 h-5 text-amber-400" />,
      title: "NEST Job Board",
      desc: "Browse and search active placement opportunities, company details, and eligibility criteria posted through SRMIST's official NEST portal.",
      color: "amber",
    },
  ];

  const stats = [
    { value: "100%", label: "Local Data Storage", icon: <Lock className="w-4 h-4 text-cyan-400" /> },
    { value: "AES-256", label: "Encryption Standard", icon: <Shield className="w-4 h-4 text-violet-400" /> },
    { value: "0 ms", label: "Server Latency*", icon: <Zap className="w-4 h-4 text-amber-400" /> },
    { value: "5+", label: "Feature Modules", icon: <Star className="w-4 h-4 text-emerald-400" /> },
  ];

  return (
    <div className="min-h-screen text-[#dfe1f4] flex flex-col font-sans relative bg-[#05060a]">
      {/* Ambient aurora background glows */}
      <div className="fixed top-[-15%] right-[-10%] w-[60vw] h-[45vh] bg-cyan-500/6 rounded-full blur-[120px] pointer-events-none animate-aurora" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[50vw] h-[40vh] bg-violet-500/6 rounded-full blur-[120px] pointer-events-none animate-aurora" style={{ animationDelay: "-4s" }} />
      <div className="fixed top-[30%] left-[40%] w-[30vw] h-[30vh] bg-amber-300/4 rounded-full blur-[100px] pointer-events-none animate-aurora" style={{ animationDelay: "-7s" }} />

      {/* Header */}
      <header className="sticky top-0 z-50 flex justify-between items-center py-4 px-6 max-w-4xl mx-auto w-full backdrop-blur-md bg-[#05060a]/60 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center gradient-brand shadow-[0_4px_16px_rgba(34,211,238,0.35)]">
            <span className="material-symbols-outlined text-[16px] text-[#05060a] font-black">diamond</span>
          </div>
          <span className="text-xl font-black text-white lowercase tracking-tight">classivo</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider btn-ghost"
          >
            sign in
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 w-full">
        <section className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto w-full py-16 px-6 relative z-10">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/25 rounded-full text-cyan-400 text-[10px] font-bold uppercase tracking-wider mb-6">
            <Shield size={10} /> SRM Institute • Privacy-First Portal
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight tracking-tight lowercase mb-6">
            re-imagining your <br/>
            <span className="gradient-text-brand">
              academic experience
            </span>
          </h1>

          {/* Subline */}
          <p className="text-[14px] sm:text-base text-white/50 max-w-xl leading-relaxed mb-10 font-medium">
            classivo is a modern, fast, and completely secure portal for SRMIST students — giving you instant access to grades, attendance, timetables, and campus tools with premium aesthetics and absolute data ownership.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-20 w-full justify-center">
            <button
              onClick={() => router.push("/login")}
              className="group px-8 py-4 rounded-2xl text-[14px] font-black uppercase tracking-widest btn-aurora flex items-center justify-center gap-2"
            >
              get started free
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="https://nancey-pandemoniacal-candra.ngrok-free.dev/classivo.apk"
              download="classivo.apk"
              className="group px-8 py-4 rounded-2xl text-[14px] font-black uppercase tracking-widest btn-ghost flex items-center justify-center gap-2"
            >
              <Smartphone size={16} />
              download android app
            </a>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full mb-16">
            {stats.map(({ value, label, icon }) => (
              <div key={label} className="aurora-surface rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center mb-2">{icon}</div>
                <div className="text-[20px] font-black text-white">{value}</div>
                <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-1">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <div className="flex items-center gap-2 px-2 mb-6">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#6EE7F7] whitespace-nowrap">
              everything you need
            </span>
            <div className="flex-1 h-[1.5px] bg-[#6EE7F7]/15 rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(({ icon, title, desc, color }) => (
              <div 
                key={title}
                className="aurora-surface aurora-surface-hover rounded-2xl p-5 text-left relative overflow-hidden"
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                    {icon}
                  </div>
                  <h3 className="text-[13px] font-extrabold text-white lowercase tracking-tight">
                    {title.toLowerCase()}
                  </h3>
                </div>
                <p className="text-[12px] text-white/45 leading-relaxed font-medium">
                  {desc.toLowerCase()}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Security section */}
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <div className="flex items-center gap-2 px-2 mb-6">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#6EE7F7] whitespace-nowrap">
              security &amp; privacy architecture
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
                className="aurora-surface aurora-surface-hover rounded-2xl p-5 text-left relative overflow-hidden"
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
        </section>

        {/* Download App Section */}
        <section className="max-w-4xl mx-auto px-6 pb-20">
          <div 
            className="rounded-3xl p-8 relative overflow-hidden text-center aurora-surface"
            style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.1) 0%, rgba(129,140,248,0.1) 100%)", border: "1px solid rgba(110,231,247,0.14)" }}
          >
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-cyan-400/8 rounded-full blur-3xl pointer-events-none animate-aurora" />
            <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-violet-400/8 rounded-full blur-3xl pointer-events-none animate-aurora" style={{ animationDelay: "-4s" }} />
            <div className="flex items-center justify-center mb-4 relative z-10">
              <div className="p-3 bg-cyan-400/10 rounded-2xl border border-cyan-400/20">
                <Smartphone className="w-8 h-8 text-cyan-300" />
              </div>
            </div>
            <h2 className="text-[24px] font-black text-white lowercase tracking-tight mb-2 relative z-10">get the android app</h2>
            <p className="text-[13px] text-white/50 font-medium leading-relaxed mb-6 max-w-sm mx-auto relative z-10">
              download classivo as a native android app for the best experience — offline support, haptic feedback, and faster loads.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center relative z-10">
              <a
                href="https://nancey-pandemoniacal-candra.ngrok-free.dev/classivo.apk"
                download="classivo.apk"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-[13px] uppercase tracking-widest btn-aurora active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Download APK (Free)
              </a>
              <button
                onClick={() => router.push("/login")}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-[13px] uppercase tracking-widest btn-ghost active:scale-[0.98]"
              >
                Use on Browser
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 text-center border-t border-white/5 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center gradient-brand">
            <span className="material-symbols-outlined text-[12px] text-[#05060a] font-black">diamond</span>
          </div>
          <span className="text-sm font-black text-white/60 lowercase">classivo</span>
        </div>
        <span className="font-mono text-[9px] font-bold text-white/25 uppercase tracking-widest">
          classivo // srm institute of science &amp; technology companion • not affiliated with srmist
        </span>
        <a
          href="/developers"
          className="inline-block text-[11px] font-black uppercase tracking-wider text-cyan-400/90 mt-3 hover:text-cyan-300 transition-colors"
        >
          classivo srm is designed and developed by sai siddharth vooka
        </a>
        <div className="flex items-center justify-center gap-4 mt-3">
          <a href="/developers" className="text-[9px] font-bold uppercase tracking-widest text-white/35 hover:text-cyan-300 transition-colors">developers</a>
          <span className="text-white/15 text-[9px]">•</span>
          <a href="/privacy" className="text-[9px] font-bold uppercase tracking-widest text-white/35 hover:text-cyan-300 transition-colors">privacy</a>
          <span className="text-white/15 text-[9px]">•</span>
          <a href="/terms" className="text-[9px] font-bold uppercase tracking-widest text-white/35 hover:text-cyan-300 transition-colors">terms</a>
        </div>
        <p className="text-[9px] text-white/15 mt-1">*server latency refers to client-side processing only</p>
      </footer>
    </div>
  );
}
