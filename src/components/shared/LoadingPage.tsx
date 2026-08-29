"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { flavorText } from "@/utils/shared/flavortext";

export default function LoadingPage() {
  const [progress, setProgress] = useState(0);
  const [flavorIndex, setFlavorIndex] = useState(0);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 10;
      });
    }, 400);

    const flavorInterval = setInterval(() => {
      setFlavorIndex((prev) => (prev + 1) % flavorText.loading.length);
    }, 2500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(flavorInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[10000] bg-theme-bg flex flex-col items-center justify-center p-8 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[60vw] h-[60vw] rounded-full bg-[#6EE7F7] blur-[100px]"
        />
        <motion.div
          animate={{ scale: [1.5, 1, 1.5], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute w-[50vw] h-[50vw] rounded-full bg-[#a78bfa] blur-[80px]"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Core Loading Orb */}
        <div className="relative w-40 h-40 flex items-center justify-center mb-12">
          {/* Orbiting Rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-dashed border-[#6EE7F7]/40"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 rounded-full border border-[#a78bfa]/30"
            style={{ borderTopColor: "transparent", borderBottomColor: "transparent" }}
          />

          {/* Center Display */}
          <div className="w-24 h-24 rounded-full bg-theme-bg/50 backdrop-blur-md border border-theme-border flex items-center justify-center shadow-[0_0_30px_rgba(110,231,247,0.2)]">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#EEF2FF] to-[#6EE7F7]">
                {Math.round(progress)}
              </span>
              <span className="text-[10px] font-bold text-[#6EE7F7]/70 uppercase tracking-[0.2em] mt-0.5">%</span>
            </div>
          </div>
        </div>

        {/* Dynamic Flavor Text */}
        <div className="h-16 flex items-center justify-center px-6 text-center max-w-[80vw]">
          <AnimatePresence mode="wait">
            <motion.div
              key={flavorIndex}
              initial={{ opacity: 0, filter: "blur(10px)", y: 10 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              exit={{ opacity: 0, filter: "blur(10px)", y: -10 }}
              transition={{ duration: 0.5 }}
              className="text-3xl font-medium text-[#EEF2FF] opacity-90 leading-tight"
            >
              {flavorText.loading[flavorIndex]}
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Brand mark */}
        <div className="absolute bottom-12 flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#EEF2FF]/30 font-title-md">classivo</span>
        </div>
      </div>
    </div>
  );
}
