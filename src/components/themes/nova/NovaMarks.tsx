"use client";
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NOVA, mono, cap, carbonGlass, statusBadge, SPRINGS } from "./tokens";
import { processAndSortMarks, buildCourseMap, getAcronym } from "@/utils/marks/marksLogic";
import { Haptics } from "@/utils/shared/haptics";

const CODE_COLORS = [NOVA.lime, NOVA.blue, NOVA.orange, NOVA.gold, NOVA.purple, NOVA.cyan, NOVA.pink];

function gradeFor(pct: number) {
  if (pct >= 91) return { g: "O", label: "OUTSTANDING", c: NOVA.green };
  if (pct >= 81) return { g: "A+", label: "EXCELLENT", c: NOVA.green };
  if (pct >= 71) return { g: "A", label: "VERY GOOD", c: NOVA.blue };
  if (pct >= 61) return { g: "B+", label: "GOOD", c: NOVA.gold };
  if (pct >= 50) return { g: "B", label: "ABOVE AVG", c: NOVA.orange };
  return { g: "F", label: "CRITICAL", c: NOVA.red };
}

export default function NovaMarks({ data }: { data: any }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const courseMap = useMemo(() => buildCourseMap(data), [data]);
  const subjects = useMemo(() => processAndSortMarks(data?.marks || [], courseMap), [data?.marks, courseMap]);

  const valid = subjects.filter((s: any) => !s.isNA && s.totalMax !== undefined && s.totalMax > 0);
  const avg = valid.length > 0
    ? Math.round((valid.reduce((a: number, s: any) => a + ((s.totalGot ?? 0) / (s.totalMax ?? 1)) * 100, 0) / valid.length) * 10) / 10
    : 0;

  const totalGotSum = valid.reduce((a: number, s: any) => a + (s.totalGot ?? 0), 0);
  const totalMaxSum = valid.reduce((a: number, s: any) => a + (s.totalMax ?? 0), 0);
  const practicalCount = subjects.filter((s: any) => s.isPractical).length;

  const overallTheme = gradeFor(avg);

  return (
    <div className="min-h-full pb-16 px-5 pt-6 space-y-6 relative overflow-hidden" style={{ background: NOVA.bg }}>
      {/* Ambient backdrop glow */}
      <div className="absolute top-0 left-1/3 w-[350px] h-[350px] rounded-full pointer-events-none opacity-20 blur-[130px]" style={{ background: overallTheme.c }} />

      {/* Header section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRINGS.smooth}
        className="flex items-center justify-between relative z-10"
      >
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ background: NOVA.lime, boxShadow: `0 0 12px ${NOVA.lime}` }}
            />
            <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ ...mono(), color: NOVA.lime }}>
              courses &amp; marks
            </p>
          </div>
          <h1 className="text-[32px] font-black tracking-tight mt-1" style={{ color: NOVA.text }}>
            Academic Load
          </h1>
        </div>

        {/* Quick info pill */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md"
          style={{
            background: "rgba(18, 24, 38, 0.7)",
            border: `1px solid ${NOVA.borderStrong}`,
            boxShadow: `0 4px 12px rgba(0, 0, 0, 0.3)`,
          }}
        >
          <span className="text-[9.5px] font-black uppercase tracking-wider" style={{ ...mono(), color: NOVA.lime }}>
            {subjects.length} courses
          </span>
          {practicalCount > 0 && (
            <>
              <span className="text-[9.5px] text-slate-600">·</span>
              <span className="text-[9.5px] font-black uppercase tracking-wider" style={{ ...mono(), color: NOVA.gold }}>
                {practicalCount} labs
              </span>
            </>
          )}
        </div>
      </motion.div>

      {/* Internal Average Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRINGS.smooth}
        className="rounded-3xl p-6 relative overflow-hidden backdrop-blur-2xl transition-all duration-300 z-10"
        style={{
          ...carbonGlass(overallTheme.c, "40"),
          borderLeft: `4px solid ${overallTheme.c}`,
        }}
      >
        {/* Ambient Glowing Aura */}
        <div
          className="absolute -top-16 -left-16 w-44 h-44 rounded-full pointer-events-none opacity-25 blur-3xl transition-all duration-500"
          style={{ background: overallTheme.c }}
        />

        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9.5px] font-black uppercase tracking-[0.22em]" style={{ color: NOVA.faint }}>
                internal average
              </span>
              <span
                className="text-[8.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  ...mono(),
                  ...statusBadge(overallTheme.c, true),
                }}
              >
                {overallTheme.label}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-[52px] font-black leading-none tracking-tight" style={{ ...mono(), color: overallTheme.c }}>
                {avg}
              </span>
              <span className="text-[20px] font-black" style={{ ...mono(), color: NOVA.faint }}>
                %
              </span>
            </div>
          </div>

          <div
            className="w-13 h-13 rounded-2xl flex items-center justify-center relative z-10 shadow-xl"
            style={{
              background: `linear-gradient(135deg, ${overallTheme.c}22 0%, ${NOVA.cyan}22 100%)`,
              border: `1px solid ${overallTheme.c}55`,
              boxShadow: `0 0 24px ${overallTheme.c}35`,
            }}
          >
            <span className="material-symbols-outlined text-[26px]" style={{ color: overallTheme.c }}>
              ssid_chart
            </span>
          </div>
        </div>

        {/* Overall Score Progress Bar */}
        <div className="mt-5 relative z-10">
          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ ...mono(), color: NOVA.faint }}>
            <span>Total Points: {totalGotSum}/{totalMaxSum}</span>
            <span>Grade Expectation: {overallTheme.g}</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden p-0.5 relative" style={{ background: "rgba(255, 255, 255, 0.05)", border: `1px solid ${NOVA.border}` }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(avg, 100)}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${overallTheme.c}88 0%, ${overallTheme.c} 100%)`,
                boxShadow: `0 0 14px ${overallTheme.c}`,
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Subjects List */}
      <div className="space-y-3.5 relative z-10">
        {subjects.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-3xl p-8 text-center backdrop-blur-2xl"
            style={{ ...carbonGlass(NOVA.lime, "20"), border: `1px dashed ${NOVA.borderStrong}` }}
          >
            <span className="material-symbols-outlined text-[36px] mb-2 opacity-40" style={{ color: NOVA.muted }}>
              auto_stories
            </span>
            <p className="text-[13px] font-bold" style={{ color: NOVA.muted }}>
              No internal marks data available yet.
            </p>
          </motion.div>
        )}

        {subjects.map((s: any, idx: number) => {
          const pct = s.totalMax ? Math.round(((s.totalGot ?? 0) / s.totalMax) * 100) : 0;
          const { g, label, c } = gradeFor(pct);
          const cc = CODE_COLORS[idx % CODE_COLORS.length];
          const isOpen = expanded === (s.id ?? idx);
          const hasAssessments = Array.isArray(s.assessments) && s.assessments.length > 0;

          return (
            <motion.div
              key={s.id ?? idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, ...SPRINGS.smooth }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                if (hasAssessments) {
                  Haptics.selection();
                  setExpanded(isOpen ? null : (s.id ?? idx));
                }
              }}
              className={`rounded-3xl p-5 backdrop-blur-2xl transition-all duration-200 ${hasAssessments ? "cursor-pointer" : ""}`}
              style={{
                ...carbonGlass(c, isOpen ? "60" : "25"),
                borderLeft: `4px solid ${c}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[9.5px] font-black tracking-widest px-2.5 py-0.5 rounded-md"
                      style={{
                        ...mono(),
                        color: cc,
                        background: `${cc}18`,
                        border: `1px solid ${cc}44`,
                        boxShadow: `0 0 10px ${cc}15`,
                      }}
                    >
                      {s.code || getAcronym(s.title) || "SUB"}
                    </span>
                    {s.isPractical && (
                      <span
                        className="text-[8.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={{
                          ...mono(),
                          color: NOVA.ink,
                          background: NOVA.gold,
                          boxShadow: `0 0 10px ${NOVA.gold}44`,
                        }}
                      >
                        lab
                      </span>
                    )}
                    <span
                      className="text-[8.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                      style={{
                        ...mono(),
                        ...statusBadge(c),
                      }}
                    >
                      {s.isNA ? "N/A" : label}
                    </span>
                  </div>

                  <h3 className="text-[16.5px] font-black tracking-tight truncate mt-2" style={{ color: NOVA.text }}>
                    {cap(String(s.title || s.code || "subject"))}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div
                      className="inline-flex items-center justify-center w-10 h-10 rounded-2xl font-black text-[17px] shadow-lg"
                      style={{
                        ...mono(),
                        color: c,
                        background: `${c}1a`,
                        border: `1px solid ${c}44`,
                        boxShadow: `0 0 14px ${c}25`,
                      }}
                    >
                      {s.isNA ? "—" : g}
                    </div>
                    <p className="text-[10px] font-bold mt-1" style={{ ...mono(), color: NOVA.muted }}>
                      {s.isNA ? "N/A" : `${s.totalGot ?? 0}/${s.totalMax ?? 0}`}
                    </p>
                  </div>
                  {hasAssessments && (
                    <motion.span
                      animate={{ rotate: isOpen ? 90 : 0 }}
                      transition={SPRINGS.smooth}
                      className="material-symbols-outlined text-[20px]"
                      style={{ color: NOVA.faint }}
                    >
                      chevron_right
                    </motion.span>
                  )}
                </div>
              </div>

              {/* Score meter */}
              {!s.isNA && (
                <div className="h-2 rounded-full mt-4 overflow-hidden p-0.5 relative" style={{ background: "rgba(255, 255, 255, 0.05)", border: `1px solid ${NOVA.border}` }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 22 }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${c}88 0%, ${c} 100%)`,
                      boxShadow: `0 0 10px ${c}77`,
                    }}
                  />
                </div>
              )}

              {/* Assessment Breakdown Accordion */}
              <AnimatePresence>
                {isOpen && hasAssessments && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 14 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={SPRINGS.smooth}
                    className="overflow-hidden"
                  >
                    <div
                      className="pt-3.5 space-y-2"
                      style={{ borderTop: `1px solid ${NOVA.borderStrong}` }}
                    >
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-2" style={{ ...mono(), color: NOVA.faint }}>
                        Assessment Breakdown
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {s.assessments.map((ass: any, aIdx: number) => {
                          const assPct = ass.max > 0 ? (ass.got / ass.max) * 100 : 0;
                          const assColor = assPct >= 80 ? NOVA.green : assPct >= 50 ? NOVA.blue : NOVA.red;
                          return (
                            <div
                              key={aIdx}
                              className="rounded-2xl p-2.5 backdrop-blur-md flex items-center justify-between"
                              style={{
                                background: NOVA.panel2,
                                border: `1px solid ${NOVA.borderStrong}`,
                              }}
                            >
                              <div className="min-w-0 pr-2">
                                <p className="text-[10px] font-bold truncate" style={{ color: NOVA.text }}>
                                  {ass.title}
                                </p>
                                <p className="text-[8.5px] font-bold uppercase tracking-wider" style={{ ...mono(), color: NOVA.faint }}>
                                  {Math.round(assPct)}% score
                                </p>
                              </div>
                              <span
                                className="text-[11px] font-black px-2 py-0.5 rounded-md shrink-0"
                                style={{
                                  ...mono(),
                                  color: assColor,
                                  background: `${assColor}18`,
                                  border: `1px solid ${assColor}33`,
                                }}
                              >
                                {ass.got}/{ass.max}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
