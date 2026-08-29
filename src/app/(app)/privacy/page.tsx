"use client";
import React from "react";
import { ArrowLeft, Shield, Lock, EyeOff, ServerOff, Database } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen text-[#dfe1f4] flex flex-col font-sans relative bg-[#050814] overflow-y-auto">
      {/* Ambient background glows */}
      <div className="fixed top-[-15%] right-[-10%] w-[60vw] h-[45vh] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[50vw] h-[40vh] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 flex justify-between items-center py-6 px-6 max-w-2xl mx-auto w-full backdrop-blur-md bg-[#050814]/60 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 active:scale-90 transition-transform border border-white/10"
          >
            <ArrowLeft size={18} className="text-cyan-400" />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/60 leading-none">Classivo</span>
            <span className="text-lg font-black tracking-tight text-white mt-1">Privacy Policy</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-6 py-12 relative z-10 space-y-8">
        
        {/* Intro */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/25 rounded-full text-cyan-400 text-[10px] font-bold uppercase tracking-wider">
            <Shield size={10} /> Privacy-First Protocol
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight lowercase">
            our privacy promise.
          </h2>
          <p className="text-xs sm:text-sm text-white/55 leading-relaxed font-medium">
            classivo is built with a zero-knowledge, local-first architecture. we genuinely do not want, collect, or store your personal academia data. here is how we protect your information.
          </p>
        </div>

        <div className="w-full h-[1.5px] bg-[#6EE7F7]/15 rounded-full" />

        {/* Pillars */}
        <div className="space-y-8">
          <div className="space-y-3">
            <h3 className="font-black text-sm uppercase tracking-[0.2em] flex items-center gap-3 text-white">
              <Lock size={18} className="text-cyan-400" /> 1. local aes-256 encryption
            </h3>
            <p className="text-xs sm:text-sm text-white/50 leading-relaxed font-medium pl-7">
              when you login, we use standard cryptographic APIs (window.crypto) to generate a unique key locally on your device. all your credentials and session details are encrypted with AES-256 before being cached.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-black text-sm uppercase tracking-[0.2em] flex items-center gap-3 text-white">
              <ServerOff size={18} className="text-violet-400" /> 2. stateless proxy scraping
            </h3>
            <p className="text-xs sm:text-sm text-white/50 leading-relaxed font-medium pl-7">
              we do not have a user database. our server acts strictly as a stateless proxy scraper. it accepts your encrypted credentials, securely submits them to the university portal to fetch data, converts the HTML to JSON, and immediately discards the data from memory.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-black text-sm uppercase tracking-[0.2em] flex items-center gap-3 text-white">
              <Database size={18} className="text-emerald-400" /> 3. device-locked storage
            </h3>
            <p className="text-xs sm:text-sm text-white/50 leading-relaxed font-medium pl-7">
              all your parsed data (attendance, marks, schedules) resides entirely inside your browser's localStorage. clearing your browser data or logging out functions as an immediate kill switch, permanently wiping everything.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-black text-sm uppercase tracking-[0.2em] flex items-center gap-3 text-white">
              <EyeOff size={18} className="text-amber-400" /> 4. zero tracking
            </h3>
            <p className="text-xs sm:text-sm text-white/50 leading-relaxed font-medium pl-7">
              we do not use telemetry, user trackers, or behavioral analytics cookies. we don't know who is using the app, and we like it that way.
            </p>
          </div>
        </div>

        <div className="w-full h-[1.5px] bg-[#6EE7F7]/15 rounded-full" />

        {/* Contact/Info */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-center">
          <p className="text-[11px] font-bold text-white/40 leading-relaxed uppercase tracking-wider">
            classivo // srm companion app
            <br />
            use it at your own risk. built for students, by students.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 text-center border-t border-white/5 max-w-2xl mx-auto w-full mt-auto">
        <p className="text-[10px] text-white/20 uppercase tracking-widest font-mono">
          © 2026 classivo. all rights reserved.
        </p>
      </footer>
    </div>
  );
}
