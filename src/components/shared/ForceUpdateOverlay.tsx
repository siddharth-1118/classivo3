"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ShieldAlert } from "lucide-react";
import { APP_VERSION } from "@/utils/shared/version";

interface UpdateInfo {
  title: string;
  message: string;
  url: string;
  minVersion?: string;
}

export default function ForceUpdateOverlay() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      setUpdateInfo((e as CustomEvent<UpdateInfo>).detail);
    };

    window.addEventListener("force_update_triggered", handleUpdate);
    return () => window.removeEventListener("force_update_triggered", handleUpdate);
  }, []);

  // Prevent Android back button from dismissing overlay
  useEffect(() => {
    if (!updateInfo) return;

    // Push a dummy history state so back button doesn't leave the overlay
    window.history.pushState({ forceUpdate: true }, "");

    const blockBack = (e: PopStateEvent) => {
      if (updateInfo) {
        // Re-push so back button is always blocked
        window.history.pushState({ forceUpdate: true }, "");
      }
    };

    window.addEventListener("popstate", blockBack);
    return () => window.removeEventListener("popstate", blockBack);
  }, [updateInfo]);

  if (!updateInfo) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[100000] flex items-center justify-center p-6"
        style={{
          background: "rgba(5, 5, 12, 0.97)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
        }}
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(220,38,38,0.08) 0%, transparent 70%)",
          }}
        />

        <motion.div
          initial={{ scale: 0.88, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="relative w-full max-w-sm flex flex-col items-center text-center"
          style={{
            background: "rgba(18, 10, 10, 0.9)",
            border: "1px solid rgba(220, 38, 38, 0.3)",
            borderRadius: "32px",
            padding: "40px 32px",
            boxShadow:
              "0 0 0 1px rgba(220,38,38,0.1), 0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Top glow stripe */}
          <div
            className="absolute top-0 left-12 right-12 h-[1px] rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(239,68,68,0.6), transparent)",
            }}
          />

          {/* Icon */}
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 relative"
            style={{
              background: "rgba(220, 38, 38, 0.12)",
              border: "1px solid rgba(220, 38, 38, 0.3)",
              boxShadow: "0 0 40px rgba(220,38,38,0.15)",
            }}
          >
            <ShieldAlert className="text-red-400" size={38} />
            {/* Pulse ring */}
            <div
              className="absolute inset-0 rounded-3xl animate-ping"
              style={{
                background: "rgba(220, 38, 38, 0.08)",
                animationDuration: "2s",
              }}
            />
          </div>

          {/* Text */}
          <div className="space-y-3 mb-8">
            <p
              className="text-[10px] font-black uppercase tracking-[0.25em]"
              style={{ color: "rgba(239,68,68,0.7)" }}
            >
              Update Required
            </p>
            <h2
              className="text-2xl font-black tracking-tight text-white"
              style={{ lineHeight: 1.2 }}
            >
              {updateInfo.title || "New Version Available"}
            </h2>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "rgba(200,180,180,0.65)" }}
            >
              {updateInfo.message ||
                "A critical update is available. Please update to continue using Classivo."}
            </p>
          </div>

          {/* Version badge */}
          {updateInfo.minVersion && (
            <div
              className="flex items-center gap-3 w-full mb-6 rounded-xl px-4 py-3"
              style={{
                background: "rgba(220,38,38,0.06)",
                border: "1px solid rgba(220,38,38,0.15)",
              }}
            >
              <div className="text-left flex-1">
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(239,68,68,0.6)" }}>
                  Your version
                </p>
                <p className="text-sm font-bold text-white/60">{APP_VERSION}</p>
              </div>
              <div
                className="w-px self-stretch"
                style={{ background: "rgba(220,38,38,0.15)" }}
              />
              <div className="text-right flex-1">
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(239,68,68,0.6)" }}>
                  Required
                </p>
                <p className="text-sm font-bold text-red-400">{updateInfo.minVersion}</p>
              </div>
            </div>
          )}

          {/* Download button */}
          <a
            href={updateInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-16 rounded-2xl flex items-center justify-center gap-3 font-black text-[15px] text-black active:scale-95 transition-transform"
            style={{
              background: "linear-gradient(135deg, #fff 0%, #e0e0e0 100%)",
              boxShadow: "0 0 40px rgba(255,255,255,0.15), 0 4px 20px rgba(0,0,0,0.4)",
            }}
          >
            <Download size={22} />
            <span>Download Update</span>
          </a>

          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em] mt-4"
            style={{ color: "rgba(200,180,180,0.35)" }}
          >
            You cannot use the app until updated
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
