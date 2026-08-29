"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { WifiOff, ServerCrash } from "lucide-react";
import MinecraftParticles from "./MinecraftParticles";
import MinecraftAmbience from "./MinecraftAmbience";
import SyncStatusNotification from "./SyncStatusNotification";
import UpdateHistory from "./UpdateHistory";
import ForceUpdateOverlay from "./ForceUpdateOverlay";
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

import { usePathname } from "next/navigation";
import { requestNotificationPermission } from "@/utils/shared/notifs";

import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isOffline, isBackendError, setIsBackendError, backendErrorMsg, setBackendErrorMsg, showWelcome, setShowWelcome, userData, isUpdateHistoryOpen, setIsUpdateHistoryOpen } = useApp();

  useEffect(() => {
    requestNotificationPermission();

    if (Capacitor.isNativePlatform()) {
      let localListener: any;
      let pushListener: any;

      const setupListeners = async () => {
        localListener = await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
          console.log('Local Notification tapped:', notification);
        });

        if (process.env.NEXT_PUBLIC_FCM_ENABLED === "true") {
          pushListener = await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('Push Notification tapped:', notification);
          });
        }
      };

      setupListeners();

      return () => {
        if (localListener) localListener.remove();
        if (pushListener) pushListener.remove();
      };
    }
  }, []);
  const [showSplash, setShowSplash] = useState(false);
  const [isFirstSplash, setIsFirstSplash] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setOverlaysWebView({ overlay: true });
    }
  }, []);

useEffect(() => {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    if (!Capacitor.isNativePlatform()) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        console.log("Service Worker registered with scope:", reg.scope);
      }).catch((err) => {
        console.warn("Service Worker registration failed:", err);
      });
    }
  }
}, []);



useEffect(() => {
  const splashPlayed = sessionStorage.getItem("classivo_splash_played") === "true";
  if (splashPlayed) return;
  
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone;

  if (isStandalone) {
    sessionStorage.setItem("classivo_splash_played", "true");
    const isOnboarded = localStorage.getItem("classivo_onboarded") === "true";
    
    if (!isOnboarded) {
      setIsFirstSplash(true);
    }
    
    setShowSplash(true);
    const safetyTimer = setTimeout(() => {
      setShowSplash(false);
    }, !isOnboarded ? 2000 : 300);
    return () => clearTimeout(safetyTimer);
  }
}, []);

useEffect(() => {
  if (isBackendError) {
    const timer = setTimeout(() => {
      setIsBackendError(false);
      setBackendErrorMsg(null);
    }, 10000);
    return () => clearTimeout(timer);
  }
}, [isBackendError, setIsBackendError, setBackendErrorMsg]);

useEffect(() => {
  if (showWelcome) {
    setShowSplash(false);
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 800);
    return () => clearTimeout(timer);
  }
}, [showWelcome, setShowWelcome]);

  const isPublicPage = pathname === "/privacy" || pathname === "/terms" || pathname === "/login" || (!userData && pathname === "/");

  return (
    <div className={
      isPublicPage
        ? "fixed inset-0 w-full h-full bg-[#050814] overflow-y-auto overflow-x-hidden z-[9999999]"
        : "fixed inset-0 w-full h-full bg-theme-bg md:bg-[#020617] flex items-center justify-center overflow-hidden z-[9999999]"
    }>
      {/* Optional decorative desktop background elements could go here */}
      {!isPublicPage && (
        <div className="hidden md:block absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      )}

      <main 
        className={
          isPublicPage
            ? "bg-[#050814] w-full min-h-full flex flex-col relative"
            : "bg-theme-bg w-full h-full overflow-hidden flex flex-col relative md:w-[400px] md:h-[850px] md:max-h-[95vh] md:rounded-[40px] md:shadow-[0_0_100px_rgba(0,0,0,0.3)] md:border-[10px] md:border-[#0F172A] shrink-0"
        }
        style={{ transform: "translateZ(0)" }} // Traps fixed elements inside this container!
      >
        <AnimatePresence>
          {isOffline && (
            <motion.div
              key="offline-status"
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              className="absolute top-4 left-4 right-4 z-[10001] flex justify-center pointer-events-none"
            >
              <div 
                className="w-full max-w-[360px] px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-between border border-red-500/20 backdrop-blur-md pointer-events-auto"
                style={{
                  background: "linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.04) 100%)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0"></div>
                  <span className="text-[11px] font-bold text-red-200 lowercase tracking-tight leading-none">
                    connection lost: offline mode active
                  </span>
                </div>
              </div>
            </motion.div>
          )}
          {isBackendError && !isOffline && (
            <motion.div
              key="backend-status"
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              className="absolute top-4 left-4 right-4 z-[10001] flex justify-center pointer-events-none"
            >
              <div 
                className="w-full max-w-[360px] px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-between border border-amber-500/20 backdrop-blur-md pointer-events-auto"
                style={{
                  background: "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)",
                  backgroundColor: "rgba(15, 23, 42, 0.4)",
                  borderColor: "rgba(245, 158, 11, 0.2)"
                }}
              >
                <div className="flex items-center gap-2.5 flex-1 pr-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"></div>
                  <span className="text-[11px] font-bold text-amber-200 lowercase tracking-tight leading-tight block">
                    server issue: {backendErrorMsg?.toLowerCase() || "unable to connect to backend"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsBackendError(false);
                    setBackendErrorMsg(null);
                  }}
                  className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/60 transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div 
          className="flex-1 relative z-10 w-full overflow-y-auto overflow-x-hidden flex flex-col"
          style={{
            paddingTop: "env(safe-area-inset-top, 0px)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            paddingLeft: "env(safe-area-inset-left, 0px)",
            paddingRight: "env(safe-area-inset-right, 0px)" }}
        >
          {children}
        </div>

        <MinecraftParticles />
        <MinecraftAmbience />
        <SyncStatusNotification />
        <UpdateHistory isOpen={isUpdateHistoryOpen} onClose={() => setIsUpdateHistoryOpen(false)} />
        <ForceUpdateOverlay />

        {/* SW App Updates banner disabled to favor in-app academic updates */}

        <AnimatePresence>
          {showWelcome && (
            <motion.div
              key="welcome-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="absolute inset-0 z-[10000] bg-theme-bg flex flex-col justify-center items-center px-8 pointer-events-auto"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="flex flex-col items-center text-center"
              >
                <span className="text-theme-muted text-sm font-bold uppercase tracking-[0.3em] mb-2">
                  Welcome
                </span>
                <h2 
                  className="text-4xl md:text-6xl font-black text-theme-text lowercase tracking-tighter leading-none"
                  
                >
                  {userData?.profile?.name || "Student"}
                </h2>
              </motion.div>
            </motion.div>
          )}

          {showSplash && (
            <motion.div
              key="splash"
              initial={{ opacity: 1 }}
              exit={{ y: "-100%" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-center z-[9999] bg-[#0F172A]"
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-6"
              >
                <div className="relative">
                  <span className="text-[4rem] md:text-[5rem] tracking-tighter lowercase font-black text-theme-text/20 select-none font-display-lg">
                    classivo
                  </span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
