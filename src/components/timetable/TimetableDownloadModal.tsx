"use client";
import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Printer, Sparkles, Calendar, Clock, MapPin, BookOpen, Check } from "lucide-react";
import { ScheduleData } from "@/types";
import { Haptics } from "@/utils/shared/haptics";

interface TimetableDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleData;
  studentName?: string;
}

export function TimetableDownloadModal({
  isOpen,
  onClose,
  schedule,
  studentName = "Student",
}: TimetableDownloadModalProps) {
  if (!isOpen) return null;

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [downloading, setDownloading] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const days = [1, 2, 3, 4, 5];

  const handlePrintPdf = () => {
    Haptics.heavy();
    window.print();
  };

  const handleDownloadPng = async () => {
    Haptics.medium();
    setDownloading(true);

    try {
      // Create SVG representation of the timetable element for high-res PNG export
      const elem = printRef.current;
      if (!elem) return;

      const htmlStr = elem.outerHTML;
      const svgStr = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${elem.offsetWidth}" height="${elem.offsetHeight}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">
              <style>
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap');
                * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
              </style>
              ${htmlStr}
            </div>
          </foreignObject>
        </svg>
      `;

      const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = 2; // 2x high resolution
        canvas.width = elem.offsetWidth * scale;
        canvas.height = elem.offsetHeight * scale;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);
          const pngUrl = canvas.toDataURL("image/png");
          const a = document.createElement("a");
          a.href = pngUrl;
          a.download = `Classivo_Timetable_${studentName.replace(/\s+/g, "_")}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
        setDownloading(false);
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 3000);
      };

      img.onerror = () => {
        // Fallback to print dialog if canvas rasterization fails
        handlePrintPdf();
        setDownloading(false);
      };

      img.src = url;
    } catch (err) {
      console.warn("PNG Download notice:", err);
      handlePrintPdf();
      setDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl rounded-3xl bg-[#0a0c14] border border-cyan-500/30 text-white shadow-2xl overflow-hidden z-10 my-auto flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white tracking-tight leading-tight">
                  Classivo Timetable Exporter
                </h3>
                <p className="text-xs text-white/50 font-medium">
                  Clean 5-Day Order Timetable with Rescheduled Class Timings
                </p>
              </div>
            </div>

            <button
              onClick={() => { Haptics.light(); onClose(); }}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="p-4 border-b border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Theme Toggle */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
              <button
                onClick={() => { Haptics.light(); setTheme("dark"); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  theme === "dark" ? "bg-cyan-500 text-black font-black" : "text-white/60 hover:text-white"
                }`}
              >
                Dark Carbon
              </button>
              <button
                onClick={() => { Haptics.light(); setTheme("light"); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  theme === "light" ? "bg-white text-black font-black" : "text-white/60 hover:text-white"
                }`}
              >
                Print Light
              </button>
            </div>

            {/* Export Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintPdf}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white flex items-center gap-2 transition-all"
              >
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                <span>Print / Save PDF</span>
              </button>
              <button
                onClick={handleDownloadPng}
                disabled={downloading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 font-black text-xs text-black flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50"
              >
                {downloading ? (
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : copiedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Timetable Downloaded!
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" /> Save PNG Image
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Timetable Preview Canvas Container */}
          <div className="p-5 overflow-y-auto flex-1 no-scrollbar">
            <div
              ref={printRef}
              id="classivo-printable-timetable"
              className={`p-6 rounded-3xl transition-colors ${
                theme === "dark"
                  ? "bg-[#0b0f19] text-white border border-white/10"
                  : "bg-white text-slate-900 border border-slate-200 shadow-lg"
              }`}
            >
              {/* Timetable Header */}
              <div className="flex items-center justify-between border-b pb-4 mb-5"
                style={{ borderColor: theme === "dark" ? "rgba(255,255,255,0.1)" : "#e2e8f0" }}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-cyan-400/20 text-cyan-400 border border-cyan-400/30">
                      CLASSIVO V2 TIMETABLE
                    </span>
                    <span className="text-xs font-bold opacity-60 font-mono">
                      SRMIST ACADEMIC SCHEDULE
                    </span>
                  </div>
                  <h2 className="text-xl font-black tracking-tight mt-1.5">
                    {studentName}&apos;s Weekly Schedule
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-mono opacity-50 uppercase tracking-wider">Generated by Classivo</p>
                  <p className="text-xs font-bold text-cyan-400 mt-0.5">Updated Timetable</p>
                </div>
              </div>

              {/* 5-Day Order Columns Grid */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
                {days.map((dayNum) => {
                  const dayKey = `Day ${dayNum}`;
                  const daySchedule = schedule?.[dayKey] || schedule?.[String(dayNum)] || {};
                  const slots = Object.entries(daySchedule).sort((a, b) => {
                    const tA = a[0].split("-")[0] || "";
                    const tB = b[0].split("-")[0] || "";
                    return tA.localeCompare(tB);
                  });

                  return (
                    <div
                      key={dayNum}
                      className={`rounded-2xl p-3.5 border flex flex-col ${
                        theme === "dark"
                          ? "bg-white/[0.03] border-white/10"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between pb-2.5 mb-3 border-b"
                        style={{ borderColor: theme === "dark" ? "rgba(255,255,255,0.08)" : "#cbd5e1" }}>
                        <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
                          Day {dayNum}
                        </span>
                        <span className="text-[10px] font-mono font-bold opacity-40">
                          {slots.length} Classes
                        </span>
                      </div>

                      {/* Class Slots List */}
                      {slots.length === 0 ? (
                        <div className="py-8 text-center opacity-40">
                          <p className="text-[11px] font-mono italic">No classes scheduled</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5 flex-1">
                          {slots.map(([timeRange, slot]: [string, any], idx) => {
                            const isLab = slot?.type === "lab" || slot?.slot?.startsWith("P");
                            const isCustom = !!slot?.isCustom;

                            return (
                              <div
                                key={idx}
                                className={`p-2.5 rounded-xl border transition-all text-left relative ${
                                  theme === "dark"
                                    ? isCustom
                                      ? "bg-amber-500/10 border-amber-500/30"
                                      : isLab
                                      ? "bg-purple-500/10 border-purple-500/30"
                                      : "bg-white/5 border-white/10"
                                    : isCustom
                                    ? "bg-amber-50 border-amber-300 text-slate-900"
                                    : isLab
                                    ? "bg-purple-50 border-purple-200 text-slate-900"
                                    : "bg-white border-slate-200 text-slate-900"
                                }`}
                              >
                                {/* Time Range */}
                                <div className="flex items-center gap-1 text-[10px] font-mono font-bold opacity-70 mb-1">
                                  <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                                  <span>{slot?.time || timeRange}</span>
                                </div>

                                {/* Subject Code / Title */}
                                <h4 className="text-xs font-extrabold leading-tight line-clamp-2">
                                  {slot?.courseTitle || slot?.title || slot?.code || slot?.course || "Class"}
                                </h4>

                                {slot?.code && slot?.code !== slot?.courseTitle && (
                                  <span className="text-[9px] font-mono opacity-50 block mt-0.5">
                                    {slot.code}
                                  </span>
                                )}

                                {/* Room & Type Info */}
                                <div className="flex items-center justify-between gap-1 mt-2 pt-1.5 border-t"
                                  style={{ borderColor: theme === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0" }}>
                                  <div className="flex items-center gap-1 text-[10px] font-bold opacity-80">
                                    <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                                    <span>{slot?.room || "Room TBA"}</span>
                                  </div>

                                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                    isCustom
                                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                                      : isLab
                                      ? "bg-purple-400/20 text-purple-300 border border-purple-400/30"
                                      : "bg-cyan-400/20 text-cyan-300 border border-cyan-400/30"
                                  }`}>
                                    {isCustom ? "Rescheduled" : isLab ? "Lab" : "Theory"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Timetable Footer */}
              <div className="mt-6 pt-4 border-t flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono opacity-50"
                style={{ borderColor: theme === "dark" ? "rgba(255,255,255,0.1)" : "#e2e8f0" }}>
                <span>Classivo Student Portal &bull; SRMIST Academic Timetable</span>
                <span>Includes Rescheduled Faculty Class Timings</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
