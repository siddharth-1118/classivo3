"use client";
import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, User, ArrowRight, Layers, Clock } from "lucide-react";
import {
  getDayOverview,
  processSchedule,
} from "@/utils/dashboard/timetableLogic";
import { flavorText } from "@/utils/shared/flavortext";
import { useApp } from "@/context/AppContext";
import { UserAvatar } from "@/components/shared/UserAvatar";

// ─── Download Timetable as Image ────────────────────────────────────────────
function downloadTimetableImage(schedule: any, data: any) {
  const DAYS = [1, 2, 3, 4, 5];
  const DAY_LABELS = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];
  
  // Get custom classes from local storage
  let customClasses: any = {};
  try {
    const stored = localStorage.getItem("classivo_custom_classes");
    if (stored) customClasses = JSON.parse(stored);
  } catch {}

  // Collect all unique time slots across all days
  const allSlots = new Set<string>();
  DAYS.forEach((day) => {
    const dayKey = `Day ${day}`;
    const daySchedule = schedule?.[dayKey] ? Object.values(schedule[dayKey]) : [];
    const customList = customClasses?.[day] || [];
    const combined = [...daySchedule, ...customList];

    combined.forEach((s: any) => {
      if (s && s.time) {
        const normTime = s.time.replace(/\s+/g, "").replace(/-/, " - ");
        allSlots.add(normTime);
      }
    });
  });
  const slots = Array.from(allSlots).sort();

  const colW = 160;
  const rowH = 70;
  const headerH = 50;
  const labelW = 90;
  const padX = 20;
  const padY = 20;
  const canvasW = padX * 2 + labelW + colW * DAYS.length;
  const canvasH = padY * 2 + headerH + rowH * Math.max(slots.length, 1);

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Title
  ctx.fillStyle = "#ceff1c";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("Classivo — Weekly Timetable", padX, padY + 14);
  const studentName = data?.profile?.name || "Student";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "11px sans-serif";
  ctx.fillText(studentName, padX, padY + 30);

  const tableTop = padY + headerH;

  // Day headers
  DAYS.forEach((day, i) => {
    const x = padX + labelW + colW * i;
    ctx.fillStyle = "rgba(206,255,28,0.12)";
    ctx.fillRect(x, tableTop, colW - 2, 36);
    ctx.fillStyle = "#ceff1c";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(DAY_LABELS[i], x + colW / 2 - 1, tableTop + 23);
  });

  // Time label column header
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(padX, tableTop, labelW - 2, 36);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("TIME", padX + labelW / 2, tableTop + 23);

  // Rows
  slots.forEach((slot, rowIdx) => {
    const y = tableTop + 36 + rowH * rowIdx;

    // Row background alternating
    ctx.fillStyle = rowIdx % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)";
    ctx.fillRect(padX, y, canvasW - padX * 2, rowH - 2);

    // Time label
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(slot, padX + labelW / 2, y + rowH / 2 + 3);

    DAYS.forEach((day, i) => {
      const x = padX + labelW + colW * i;
      const dayKey = `Day ${day}`;
      const daySchedule = schedule?.[dayKey] ? Object.values(schedule[dayKey]) : [];
      const customList = customClasses?.[day] || [];
      const combined = [...daySchedule, ...customList];

      const entry = combined.find((s: any) => {
        if (!s || !s.time) return false;
        const normTime = s.time.replace(/\s+/g, "").replace(/-/, " - ");
        return normTime === slot;
      });

      if (entry && entry.type !== "break") {
        ctx.fillStyle = "rgba(206,255,28,0.1)";
        ctx.beginPath();
        ctx.roundRect(x + 4, y + 4, colW - 10, rowH - 10, 8);
        ctx.fill();

        ctx.fillStyle = "#ceff1c";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        
        const code = entry.courseCode || entry.course || entry.code || "";
        const name = entry.courseTitle || entry.name || entry.title || code;
        const displayName = String(name).slice(0, 18);
        ctx.fillText(displayName, x + colW / 2 - 1, y + rowH / 2 - 2);

        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "9px sans-serif";
        ctx.fillText(entry.room || "—", x + colW / 2 - 1, y + rowH / 2 + 12);
      }
    });
  });

  if (slots.length === 0) {
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No timetable data available", canvasW / 2, canvasH / 2);
  }

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.font = "9px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Downloaded from classivo.app • SRMIST", canvasW / 2, canvasH - 8);

  // Download
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `classivo-timetable-${studentName.replace(/\s+/g, "-").toLowerCase()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
// ────────────────────────────────────────────────────────────────────────────

export default function Timetable({ schedule, dayOrder, data }) {
  const { profileSeed } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeDayOrder, setActiveDayOrder] = useState(1);
  const [customClasses, setCustomClasses] = useState<Record<number, any[]>>({});
  const [mounted, setMounted] = useState(false);
  const [introMode, setIntroMode] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (dayOrder && dayOrder !== "-") {
      setActiveDayOrder(parseInt(dayOrder));
    }
    const fetchCustoms = () => {
      const stored = localStorage.getItem("classivo_custom_classes");
      if (stored) {
        try {
          setCustomClasses(JSON.parse(stored));
        } catch (e) {}
      }
    };
    fetchCustoms();
    window.addEventListener("custom_classes_updated", fetchCustoms);

    const timer = setTimeout(() => setIntroMode(false), 800);

    return () => {
      window.removeEventListener("custom_classes_updated", fetchCustoms);
      clearTimeout(timer);
    };
  }, [dayOrder]);

  const currentRoast = useMemo(() => {
    const roasts = flavorText.timetable || [
      "your schedule is looking tight.",
      "another day, another set of bunkers.",
      "may your classes be short and attendance high.",
      "the grind doesn't stop, but you can.",
    ];
    return roasts[Math.floor(Math.random() * roasts.length)];
  }, []);

  const courseMap = useMemo(() => {
    const map: any = {};
    if (data?.attendance) {
      data.attendance.forEach((sub: any) => {
        if (sub.code && sub.title) {
          const code = sub.code.trim();
          const isPrac = (sub.category || "").toLowerCase().includes("practical") || 
                        (sub.slot || "").toUpperCase().startsWith("P");
          
          if (!map[code] || isPrac) {
            map[code] = sub.title;
          }
        }
      });
    }
    return map;
  }, [data]);

  const dateDisplay = useMemo(() => {
    const d = new Date();
    return {
      date: d.getDate(),
      month: d.toLocaleString("default", { month: "short" }).toUpperCase(),
      day: d.toLocaleString("default", { weekday: "long" }).toUpperCase(),
      year: d.getFullYear(),
    };
  }, []);

  const currentSchedule = useMemo(() => {
    return processSchedule(
      schedule,
      customClasses,
      activeDayOrder,
      parseInt(dayOrder) || 1,
      courseMap,
    );
  }, [schedule, customClasses, activeDayOrder, dayOrder, courseMap]);

  if (!mounted) return null;

  return (
    <div className="h-screen w-full bg-[#050505] flex flex-col relative overflow-hidden font-sans">
      <div className="pt-16 px-8 absolute top-0 w-full z-0">
        <div className="flex flex-col text-white">
          <span
            className="text-[#ceff1c] font-black text-sm tracking-[0.2em] uppercase mb-2 ml-1"
            
          >
            {dateDisplay.day}
          </span>
          <div className="flex items-baseline leading-[0.8]">
            <h1
              className="text-[130px] font-medium tracking-tighter text-white"
              
            >
              {dateDisplay.date}
            </h1>
            <div className="flex flex-col ml-4 mb-3">
              <span
                className="text-4xl font-black text-white/30 uppercase"
                
              >
                {dateDisplay.month}
              </span>
              <span className="text-xs text-white/20 font-bold font-mono tracking-widest mt-1">
                {dateDisplay.year}
              </span>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        layout
        animate={{
          top: isExpanded ? "0%" : "38%",
          height: isExpanded ? "100%" : "62%" }}
        transition={{ type: "spring", stiffness: 200, damping: 30 }}
        className={`absolute w-full bg-[#fdfdfd] flex flex-col shadow-[0_-30px_80px_rgba(0,0,0,0.9)] z-20 overflow-hidden rounded-t-[32px] transition-transform duration-700 ease-in-out ${
          introMode ? "translate-y-[60%]" : "translate-y-0"
        }`}
      >
        <div className="w-full bg-[#fdfdfd] z-30 pt-4 pb-2 sticky top-0">
          <div
            className="w-full flex justify-center mb-6 cursor-grab active:cursor-grabbing"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="w-12 h-1.5 bg-black/10 rounded-full"></div>
          </div>

          <div className="px-6 pb-2">
            <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-black/40">
                  Day Order
                </span>
                <div className="flex items-center gap-2">
                  {parseInt(dayOrder) === activeDayOrder && (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-black bg-[#ceff1c] px-2 py-0.5 rounded-sm">
                      Today
                    </span>
                  )}
                  {/* Download Timetable */}
                  <button
                    onClick={() => downloadTimetableImage(schedule, data)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-black text-[#ceff1c] rounded-lg text-[9px] font-black uppercase tracking-wider active:scale-90 transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M5 20h14v-2H5v2zm7-18v10.59l-3.29-3.3-1.42 1.42L12 16l4.71-4.29-1.42-1.42L13 13.59V2h-1z"/></svg>
                    Save
                  </button>
                </div>
              </div>

            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setActiveDayOrder(num)}
                  className={`flex-1 h-11 rounded-xl flex items-center justify-center text-lg font-bold transition-all
                    ${
                      activeDayOrder === num
                        ? "bg-black text-[#ceff1c] shadow-lg scale-105"
                        : "bg-white text-black/40 border border-black/5"
                    }
                  `}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-24 pt-2">
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {currentSchedule.length > 0 ? (
                currentSchedule.map((item: any, index: number) => {
                  if (item.type === "break") {
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-center py-2"
                      >
                        <span className="text-[10px] font-bold tracking-widest text-black/30 uppercase">
                          {item.title}
                        </span>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      className={`w-full rounded-[24px] p-5 relative border transition-all duration-300
                        ${
                          item.isCurrent
                            ? "bg-white border-[#3b82f6] shadow-xl ring-1 ring-blue-100"
                            : "bg-white border-[#f0f0f0]"
                        }
                      `}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-2 rounded-lg ${item.isCurrent ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-400"}`}
                          >
                            <Clock size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-lg font-bold text-black leading-none">
                              {item.start}
                            </span>
                            <span className="text-[10px] font-medium text-black/40 uppercase mt-1">
                              to {item.end}
                            </span>
                          </div>
                        </div>
                        <div className="text-[9px] font-bold text-black/40 uppercase tracking-widest bg-black/5 px-2 py-1 rounded">
                          {item.slot || (item.type === "lab" ? "PRAC" : "THRY")}
                        </div>
                      </div>

                      <div className="mb-4">
                        <h3
                          className="text-lg font-bold text-black leading-tight lowercase mb-2"
                          
                        >
                          {item.name || item.course}
                        </h3>
                        <div className="flex items-center gap-2">
                          <User size={12} className="text-black/30" />
                          <span className="text-[10px] font-bold uppercase tracking-wide text-black/50">
                            {item.faculty?.split("(")[0] || "Faculty N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-50 flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <MapPin
                            size={14}
                            className={
                              item.isCurrent ? "text-blue-500" : "text-black/20"
                            }
                          />
                          <span className="text-xs font-black text-black uppercase">
                            {item.room}
                          </span>
                        </div>

                        {item.isCurrent && (
                          <span className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-tighter animate-pulse">
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                            In Progress
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                  <Layers size={48} className="mb-4" />
                  <h3 className="text-xl font-bold lowercase">free day</h3>
                  <p className="text-[10px] uppercase tracking-[0.2em]">
                    No classes scheduled
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {introMode && (
          <motion.div
            key="introOverlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex flex-col justify-end items-start p-8 pb-[60%] z-50 bg-[#050505]"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              <h1
                className="text-6xl font-black lowercase tracking-tighter text-[#ceff1c] mb-2"
                
              >
                timetable
              </h1>
              <div
                className="text-xl font-bold lowercase text-white/80 leading-tight max-w-[80%] flex items-center gap-2"
                
              >
                <UserAvatar seed={profileSeed} className="w-6 h-6 shrink-0" />
                {currentRoast}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
