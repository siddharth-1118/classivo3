"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { motion } from "framer-motion";
import { ChevronRight, ShieldCheck, Zap, Sparkles } from "lucide-react";

export default function OnboardingRoute() {
  const router = useRouter();
  const { userData, loginPromise } = useApp();

  useEffect(() => {
    const checkStatus = () => {
      const isOnboarded = localStorage.getItem("classivo_onboarded") === "true";
      const hasData = localStorage.getItem("classivo_data") || userData;
      const hasSession = document.cookie.includes("classivo_session=");

      if (isOnboarded && hasData && (hasSession || userData)) {
        router.replace("/");
        return;
      } else if (!hasData && !hasSession && !loginPromise) {
        router.replace("/login");
        return;
      }
    };

    checkStatus();
  }, [router, userData, loginPromise]);

  const handleComplete = () => {
    localStorage.setItem("classivo_onboarded", "true");
    document.cookie = "classivo_onboarded=true; path=/; max-age=31536000; SameSite=Lax";
    router.push("/login");
  };

  return (
    <div className="min-h-screen text-theme-text flex flex-col justify-between p-8 font-sans relative overflow-hidden" style={{ background: '#050814' }}>
      {/* Ambient glows */}
      <div className="absolute top-[-15%] right-[-5%] w-[50vw] h-[40vh] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(110,231,247,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40vw] h-[35vh] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(167,139,250,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex-1 flex flex-col justify-center"
      >
        <div className="mb-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: 'linear-gradient(135deg, rgba(226,201,116,0.2) 0%, rgba(167,139,250,0.15) 100%)', border: '1.5px solid rgba(226,201,116,0.3)', boxShadow: '0 0 24px rgba(226,201,116,0.2)' }}
          >
            <Sparkles className="w-8 h-8" style={{ color: '#E2C974', filter: 'drop-shadow(0 0 6px rgba(226,201,116,0.6))' }} />
          </motion.div>
          <h1
            className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 font-display-lg"
            style={{ background: 'linear-gradient(135deg, #ffffff 0%, #E2C974 60%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            Welcome to <br/>
            Classivo
          </h1>
          <p className="text-lg font-medium max-w-md leading-relaxed" style={{ color: 'rgba(238,242,255,0.5)' }}>
            The official portal for your academia data.
          </p>
        </div>

        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-start gap-4"
          >
            <div className="p-3 rounded-xl flex-shrink-0" style={{ background: 'rgba(226,201,116,0.08)', border: '1px solid rgba(226,201,116,0.18)' }}>
              <Zap className="w-6 h-6" style={{ color: '#E2C974' }} />
            </div>
            <div className="pt-0.5">
              <h3 className="font-bold text-lg" style={{ color: '#EEF2FF' }}>Blazing Fast</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(238,242,255,0.45)' }}>Instantly fetch your marks, attendance, and timetable without the wait.</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-start gap-4"
          >
            <div className="p-3 rounded-xl flex-shrink-0" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.18)' }}>
              <ShieldCheck className="w-6 h-6" style={{ color: '#a78bfa' }} />
            </div>
            <div className="pt-0.5">
              <h3 className="font-bold text-lg" style={{ color: '#EEF2FF' }}>Secure &amp; Private</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(238,242,255,0.45)' }}>Your credentials never leave your device. Fully encrypted locally.</p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="pt-8 pb-4"
      >
        <button
          onClick={handleComplete}
          className="w-full flex items-center justify-center gap-2 py-4 font-bold rounded-2xl text-lg active:scale-[0.95] transition-all"
          style={{ background: 'linear-gradient(135deg, rgba(226,201,116,0.2) 0%, rgba(167,139,250,0.15) 100%)', border: '1.5px solid rgba(226,201,116,0.28)', boxShadow: '0 8px 32px rgba(226,201,116,0.15)', color: '#EEF2FF' }}
        >
          Get Started
          <ChevronRight className="w-5 h-5" style={{ color: '#E2C974' }} />
        </button>
      </motion.div>
    </div>
  );
}
