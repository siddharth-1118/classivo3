"use client";
import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Loader } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  processAndSortMarks,
  buildCourseMap,
  getAcronym,
  getTheme,
  getGrade,
  calculatePredictedGpa,
} from "@/utils/marks/marksLogic";
import { AcademiaData } from "@/types";
import { useAppLayout } from "@/context/AppLayoutContext";
import { useApp } from "@/context/AppContext";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Haptics } from "@/utils/shared/haptics";

const BEZIER = [0.34, 0.15, 0.16, 0.96] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: -20, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: BEZIER },
  },
};

const normalize = (str: string) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();

const getCourseIcon = (name: string) => {
  const norm = name.toLowerCase();
  if (norm.includes("algorithm") || norm.includes("program") || norm.includes("code") || norm.includes("data structure")) {
    return "terminal";
  } else if (norm.includes("cloud") || norm.includes("network") || norm.includes("distributed")) {
    return "cloud";
  } else if (norm.includes("math") || norm.includes("discrete") || norm.includes("algebra") || norm.includes("probability")) {
    return "functions";
  } else if (norm.includes("hardware") || norm.includes("microprocessor") || norm.includes("embedded") || norm.includes("digital")) {
    return "memory";
  }
  return "menu_book";
};

export default function Marks({
  data,
}: {
  data: AcademiaData;
}) {
  const router = useRouter();
  const { profileSeed } = useApp();
  const { setIsSwipeDisabled } = useAppLayout();
  const [activeTab, setActiveTab] = useState<"all" | "theory" | "practical">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  // Target SGPA settings
  const [targetSgpa, setTargetSgpa] = useState<number>(9.5);

  const {
    pullY,
    isRefreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = usePullToRefresh(false);

  useEffect(() => {
    setIsSwipeDisabled(false);
  }, [setIsSwipeDisabled]);

  const [expectedMarksMap, setExpectedMarksMap] = useState<Record<number, number>>({});
  const [ignoredSubjectIds, setIgnoredSubjectIds] = useState<number[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const subjects = useMemo(() => {
    if (!data?.marks || data.marks.length === 0) return [];
    const courseMap = buildCourseMap(data);
    const sorted = processAndSortMarks(data.marks, courseMap);
    
    return sorted.map((sub: any) => {
      const sStr = sub.slot || "";
      const firstSlot = sStr.split(/[,\s+-]/)[0].trim().toUpperCase();
      let courseDetails = (data.courses as any)?.[firstSlot];

      if (!courseDetails) {
        const normCode = normalize(sub.code);
        courseDetails = Object.values(data.courses || {}).find((c: any) => 
          (normalize(c.code) === normCode || normalize(c.courseCode) === normCode) &&
          ((c.type || "").toLowerCase().includes("lab") === sub.isPractical || 
           (c.type || "").toLowerCase().includes("practical") === sub.isPractical)
        );
      }

      const credits = courseDetails?.credits
        ? parseFloat(courseDetails.credits)
        : (sub.credits || 0);

      // Prefer courseDetails.name from data.courses over the resolved sub.title
      const resolvedName = courseDetails?.name || courseDetails?.courseTitle || sub.title || sub.code;

      return {
        ...sub,
        title: resolvedName,
        credits,
        displayCode: getAcronym(resolvedName) || sub.code,
        displayName: resolvedName.toLowerCase(),
        theme: getTheme(sub.percentage, sub.totalMax),
        icon: getCourseIcon(resolvedName),
      };
    });
  }, [data]);

  // Initialize expected marks
  useEffect(() => {
    if (subjects.length > 0 && Object.keys(expectedMarksMap).length === 0) {
      const initialMap: Record<number, number> = {};
      subjects.forEach((sub: any) => {
        // Set expected marks to default safe guess (80% of max external marks)
        const maxExt = 100 - sub.totalMax;
        initialMap[sub.id] = Math.round(maxExt * 0.85);
      });
      setExpectedMarksMap(initialMap);
    }
  }, [subjects, expectedMarksMap]);

  // Map expected marks to target grades for calculatePredictedGpa utility
  const targetGrades = useMemo(() => {
    const gradesMap: Record<number, number> = {};
    subjects.forEach((sub: any) => {
      const exp = expectedMarksMap[sub.id] || 0;
      const total = sub.totalGot + exp;
      // Map final total to 10-point scale for SGPA calculation
      let gradeVal = 9; // A+ (9 points)
      if (total >= 91) gradeVal = 10; // O
      else if (total >= 81) gradeVal = 9; // A+
      else if (total >= 71) gradeVal = 8; // A
      else if (total >= 61) gradeVal = 7; // B+
      else if (total >= 56) gradeVal = 6; // B
      else if (total >= 50) gradeVal = 5; // C
      else gradeVal = 0; // F
      
      gradesMap[sub.id] = gradeVal;
    });
    return gradesMap;
  }, [subjects, expectedMarksMap]);

  const predictedGpa = useMemo(() => {
    return calculatePredictedGpa(subjects, targetGrades, ignoredSubjectIds);
  }, [subjects, targetGrades, ignoredSubjectIds]);

  const handleExpectedSliderChange = (id: number, val: number) => {
    setExpectedMarksMap(prev => ({ ...prev, [id]: val }));
  };

  // Critical path warnings based on targets
  const criticalWarnings = useMemo(() => {
    const warnings: string[] = [];
    subjects.forEach((sub: any) => {
      const maxExt = 100 - sub.totalMax;
      const exp = expectedMarksMap[sub.id] || 0;
      const total = sub.totalGot + exp;
      if (total < 85) {
        warnings.push(`You need to score at least ${Math.round(maxExt * 0.9)}/${maxExt} in the semester exam for ${sub.title.toLowerCase()} to secure an O grade.`);
      }
    });
    return warnings.slice(0, 1); // return only the first critical warning
  }, [subjects, expectedMarksMap]);

  if (!mounted) return null;

  const currentGpa = parseFloat(predictedGpa);
  const diffGpa = targetSgpa - currentGpa;
  const isTargetAchieved = diffGpa <= 0;

  // Main SGPA Ring parameters
  const mainRadius = 110;
  const mainCircumference = 2 * Math.PI * mainRadius;
  const mainStrokeOffset = mainCircumference - (Math.min(currentGpa, 10.0) / 10.0) * mainCircumference;

  // Small Target progress ring parameters
  const targetOffset = mainCircumference - (targetSgpa / 10.0) * mainCircumference;

  return (
    <div className="absolute inset-0 bg-[#0f131f] text-[#dfe1f4] overflow-hidden select-none font-body-lg">
      
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/30 backdrop-blur-lg border-b border-outline-variant/10 h-16 flex justify-between items-center px-5 w-full">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { Haptics.light(); router.push("/"); }}
            className="p-2 hover:bg-primary/10 rounded-full transition-colors active:scale-90 duration-200 shrink-0"
          >
            <span className="material-symbols-outlined text-primary-container">arrow_back</span>
          </button>
          <h1 className="font-headline-lg-mobile text-[22px] font-black text-primary-container lowercase tracking-tight">
            marks
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="font-label-caps text-[9px] text-on-surface-variant uppercase tracking-wider font-bold">Target Goal</span>
            <span className="font-title-md text-[14px] text-primary-container font-black">{targetSgpa.toFixed(2)} SGPA</span>
          </div>
          <div className="relative w-8 h-8">
            <svg className="w-full h-full transform -rotate-90">
              <circle className="text-surface-container-high" cx="16" cy="16" fill="transparent" r="14" stroke="currentColor" strokeWidth="2.5"></circle>
              <circle className="text-primary-container" cx="16" cy="16" fill="transparent" r="14" stroke="#6ee7f7" strokeDasharray="88" strokeDashoffset={88 - (currentGpa / 10.0) * 88} strokeWidth="2.5" style={{ filter: "drop-shadow(0 0 2px #6ee7f7)" }}></circle>
            </svg>
          </div>
        </div>
      </header>

      {/* Main scroll wrapper */}
      <div
        className="absolute inset-0 overflow-y-auto no-scrollbar"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <motion.main 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          style={{ y: pullY }}
          className="pt-24 pb-32 px-5 max-w-4xl mx-auto space-y-8"
        >
          {/* Main GPA Ring Section */}
          <motion.section variants={itemVariants} className="flex flex-col items-center justify-center py-4 shrink-0">
            <div className="relative w-64 h-64 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                {/* Base Track */}
                <circle className="opacity-30" cx="128" cy="128" fill="transparent" r={mainRadius} stroke="#262937" stroke-width="12"></circle>
                {/* Current GPA Progress */}
                <motion.circle 
                  cx="128" 
                  cy="128" 
                  fill="transparent" 
                  r={mainRadius} 
                  stroke="#6ee7f7" 
                  strokeDasharray={mainCircumference}
                  initial={{ strokeDashoffset: mainCircumference }}
                  animate={{ strokeDashoffset: mainStrokeOffset }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  strokeLinecap="round" 
                  strokeWidth="12"
                  style={{ filter: "drop-shadow(0 0 5px rgba(110,231,247,0.5))" }}
                />
                {/* Target GPA Thinner Indicator */}
                <circle 
                  className="opacity-40" 
                  cx="128" 
                  cy="128" 
                  fill="transparent" 
                  r={mainRadius} 
                  stroke="#c0c1ff" 
                  strokeDasharray={mainCircumference} 
                  strokeDashoffset={targetOffset} 
                  strokeWidth="2"
                />
              </svg>
              <div className="text-center z-10">
                <span className="block font-label-caps text-[10px] text-on-surface-variant mb-1 font-bold uppercase tracking-wider">PROJECTED SGPA</span>
                <h2 className="font-display-lg text-[44px] font-black text-primary-container leading-none" style={{ textShadow: "0 0 10px rgba(110,231,247,0.3)" }}>
                  {predictedGpa}
                </h2>
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-primary-container/10 border border-primary-container/20 rounded-full">
                  <span className="material-symbols-outlined text-[16px] text-primary-container font-bold">
                    {isTargetAchieved ? "check" : "trending_up"}
                  </span>
                  <span className="font-label-caps text-[9.5px] text-primary-container font-bold uppercase tracking-wider">
                    {isTargetAchieved ? "target achieved!" : `+${diffGpa.toFixed(2)} to reach target`}
                  </span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Sliding segmented control tabs */}
          <motion.section variants={itemVariants} className="flex flex-col">
            <div className="flex gap-1.5 p-1 rounded-full bg-slate-950/45 border border-white/5 shadow-inner">
              {["all", "theory", "practical"].map((tab) => {
                const count = subjects.filter((s: any) =>
                  tab === "all" ? true : tab === "theory" ? !s.isPractical : s.isPractical
                ).length;
                const isAct = activeTab === tab;
                
                return (
                  <button
                    key={tab}
                    onClick={() => { Haptics.selection(); setActiveTab(tab as any); }}
                    className="flex-1 py-2.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 relative z-10"
                    style={{ color: isAct ? '#050814' : 'rgba(238,242,255,0.45)' }}
                  >
                    <span>{tab}</span>
                    <span className="text-[8px] opacity-60">({count})</span>
                    {isAct && (
                      <motion.div
                        layoutId="activeMarksTabPill"
                        className="absolute inset-0 bg-primary-container rounded-full -z-10 shadow-lg"
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.section>

          {/* Course Marks List (Accordion-style) */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex justify-between items-end mb-2 px-1">
              <h3 className="font-title-md text-[16px] text-on-surface lowercase font-black">academic performance</h3>
              <span className="font-label-caps text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                {subjects.filter((s: any) => activeTab === "all" ? true : activeTab === "theory" ? !s.isPractical : s.isPractical).length} courses
              </span>
            </div>

            <div className="space-y-3">
              {subjects
                .filter((s: any) => activeTab === "all" ? true : activeTab === "theory" ? !s.isPractical : s.isPractical)
                .map((sub: any) => {
                  const isExpanded = expandedId === sub.id;
                  const maxExt = 100 - sub.totalMax;
                  const expVal = expectedMarksMap[sub.id] || 0;
                  const finalScore = sub.totalGot + expVal;
                  const projectedGrade = getGrade(finalScore);

                  return (
                    <div 
                      key={sub.id}
                      className={`glass-panel rounded-xl overflow-hidden transition-all duration-300 border border-outline-variant/15 hover:border-primary-container/20 shadow-md ${
                        isExpanded ? "border-glow-primary bg-surface-container-low/50" : ""
                      }`}
                    >
                      <div 
                        className="p-5 flex justify-between items-center cursor-pointer select-none"
                        onClick={() => { Haptics.selection(); setExpandedId(isExpanded ? null : sub.id); }}
                      >
                        <div className="flex gap-4 items-center overflow-hidden pr-2">
                          <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center border border-secondary/20 shrink-0 text-secondary">
                            <span className="material-symbols-outlined text-[20px]">{sub.icon}</span>
                          </div>
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="font-label-caps text-[10px] font-bold text-primary-container uppercase tracking-wider">
                                {sub.code}
                              </span>
                              {sub.isPractical && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-950/40 text-indigo-400 border border-indigo-900/30 text-[7px] font-black tracking-wider uppercase">LAB</span>
                              )}
                            </div>
                            <h4 className="font-title-md text-[16px] text-on-surface truncate capitalize font-black tracking-tight leading-tight mt-0.5">
                              {sub.title.toLowerCase()}
                            </h4>
                            <p className="font-label-caps text-[9px] text-on-surface-variant font-bold mt-1 uppercase tracking-wider truncate">
                              {sub.credits} credits
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3 shrink-0">
                          <div>
                            <span className="block font-title-md text-[16px] text-primary-container font-black">
                              {sub.totalGot}
                            </span>
                            <span className="font-label-caps text-[8.5px] text-on-surface-variant font-bold uppercase tracking-wider block">INTERNAL</span>
                          </div>
                          <span className="material-symbols-outlined text-on-surface-variant text-[20px] transition-transform duration-350" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                            expand_more
                          </span>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-surface-container-lowest/30 border-t border-outline-variant/10"
                          >
                            <div className="p-5 space-y-6">
                              {/* Assessment Details */}
                              <div className="grid grid-cols-2 gap-4">
                                {sub.assessments.map((box: any, idx: number) => (
                                  <div key={idx} className="space-y-2 bg-slate-950/20 p-3 rounded-xl border border-outline-variant/10">
                                    <div className="flex justify-between text-[11.5px] font-semibold text-on-surface-variant">
                                      <span className="truncate pr-1 lowercase">{box.title}</span>
                                      <span className="text-primary shrink-0">{box.got}/{box.max}</span>
                                    </div>
                                    <div className="h-1 bg-surface-container-high rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-primary-container" 
                                        style={{ width: `${box.max > 0 ? (box.got / box.max) * 100 : 0}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                                {sub.assessments.length === 0 && (
                                  <div className="col-span-2 text-center text-xs text-on-surface-variant py-2 italic font-semibold">
                                    no assessment breakdowns
                                  </div>
                                )}
                              </div>

                              {/* Class Benchmarks mock chart */}
                              <div className="p-4 bg-surface-container-high/20 rounded-xl border border-outline-variant/10">
                                <p className="font-label-caps text-[9px] text-on-surface-variant font-bold mb-4 uppercase tracking-wider">Class Benchmark (Internals)</p>
                                <div className="flex items-end gap-2.5 h-16 px-1">
                                  <div className="flex-1 bg-surface-container-highest rounded-t-[4px] relative h-[50%]" />
                                  <div className="flex-1 bg-primary-container rounded-t-[4px] relative h-[84%] flex justify-center">
                                    <div className="absolute -top-6 bg-background px-2 py-0.5 rounded text-[9px] border border-primary-container/40 text-primary-container font-black">
                                      {sub.totalGot.toFixed(0)}
                                    </div>
                                  </div>
                                  <div className="flex-1 bg-surface-container-highest rounded-t-[4px] h-[65%]" />
                                  <div className="flex-1 bg-surface-container-highest rounded-t-[4px] h-[40%]" />
                                  <div className="flex-1 bg-surface-container-highest rounded-t-[4px] h-[72%]" />
                                </div>
                                <div className="flex justify-between mt-2.5 text-[8.5px] text-on-surface-variant font-bold uppercase tracking-widest px-1">
                                  <span>Low</span>
                                  <span>You</span>
                                  <span>Avg</span>
                                  <span>High</span>
                                  <span>Med</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
            </div>
          </motion.section>

          {/* Target SGPA Calculator (Inline Sliders) */}
          <motion.section variants={itemVariants} className="glass-panel border border-outline-variant/15 rounded-2xl p-6 space-y-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center border border-primary-container/10">
                <span className="material-symbols-outlined text-primary-container text-[20px]">calculate</span>
              </div>
              <h3 className="font-title-md text-[18px] text-primary lowercase font-black">Target SGPA Simulator</h3>
            </div>
            <p className="font-body-sm text-[13px] text-on-surface-variant font-medium leading-relaxed">
              adjust expected university end-semester exam marks to predict grades and SGPA.
            </p>

            <div className="space-y-6 pt-2">
              {subjects.map((sub: any) => {
                const maxExt = 100 - sub.totalMax;
                const expVal = expectedMarksMap[sub.id] || 0;
                const totalCombined = sub.totalGot + expVal;
                const predictedGrade = getGrade(totalCombined);

                let badgeColor = "bg-primary-container/10 text-primary-container border-primary-container/20";
                if (predictedGrade === "O") badgeColor = "bg-secondary-container/20 text-secondary border-secondary-container/40";
                else if (predictedGrade === "F") badgeColor = "bg-alert-rose/10 text-alert-rose border-alert-rose/20";

                return (
                  <div key={sub.id} className="space-y-3 bg-slate-950/20 p-4 rounded-xl border border-outline-variant/10">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-body-lg text-[14.5px] text-primary truncate capitalize font-bold">{sub.title.toLowerCase()}</span>
                      <div className={`px-2.5 py-0.5 border rounded-lg font-bold text-[11px] shrink-0 font-label-caps uppercase ${badgeColor}`}>
                        predicted: {predictedGrade}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <input 
                        className="w-full" 
                        max={maxExt} 
                        min="0" 
                        type="range" 
                        value={expVal}
                        onChange={(e) => handleExpectedSliderChange(sub.id, parseInt(e.target.value))}
                      />
                      <div className="flex justify-between text-[8.5px] text-on-surface-variant font-bold uppercase tracking-wider">
                        <span>0 MARKS</span>
                        <span className="text-[#dfe1f4]">{expVal}/{maxExt} EXPECTED</span>
                        <span>{maxExt} MARKS</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-6 border-t border-outline-variant/15 flex justify-between items-center">
              <div>
                <span className="block font-label-caps text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">SIMULATED SGPA</span>
                <span className="text-[26px] font-black text-primary-container" style={{ textShadow: "0 0 10px rgba(110,231,247,0.4)" }}>
                  {predictedGpa}
                </span>
              </div>
              <button 
                onClick={() => {
                  Haptics.heavy();
                  // Save custom project values to localStorage
                  localStorage.setItem("classivo_simulated_expected_marks", JSON.stringify(expectedMarksMap));
                  alert("Simulation values saved locally!");
                }}
                className="bg-primary-container text-on-primary-container px-5 py-3 rounded-xl font-label-caps text-[12px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(110,231,247,0.25)] border border-primary-container/20"
              >
                Save Simulation
              </button>
            </div>
          </motion.section>

          {/* Dynamic Context Warnings */}
          {criticalWarnings.length > 0 && (
            <motion.div variants={itemVariants} className="p-4 bg-error-container/10 border border-error-container/20 rounded-2xl flex gap-3.5 items-start">
              <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">info</span>
              <div className="space-y-0.5">
                <p className="font-title-md text-[14px] text-error font-black uppercase tracking-wider leading-none">critical path warning</p>
                <p className="font-body-sm text-[12px] text-on-error-container opacity-80 leading-relaxed font-semibold">
                  {criticalWarnings[0]}
                </p>
              </div>
            </motion.div>
          )}

        </motion.main>
      </div>
    </div>
  );
}
