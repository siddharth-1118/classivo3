"use client";
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NOVA, mono, cap, carbonGlass, statusBadge, SPRINGS } from "./tokens";
import {
  getBaseAttendance,
  getProcessedList,
  getStatus,
  getOverallStats,
} from "@/utils/attendance/attendanceLogic";
import { Haptics } from "@/utils/shared/haptics";

export default function NovaAttendance({ data, academia }: { data: any; academia: any }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const base = useMemo(() => getBaseAttendance(data?.attendance || []), [data?.attendance]);
  const processed = useMemo(() => getProcessedList(base, {}, false), [base]);
  const stats = useMemo(() => getOverallStats(base), [base]);

  const totalConducted = base.reduce((a: number, s: any) => a + (s.conducted || 0), 0);
  const totalPresent = base.reduce((a: number, s: any) => a + (s.present || 0), 0);
  const totalAbsent = totalConducted - totalPresent;

  const pct = Number(stats.pct);
  const color = pct >= 85 ? NOVA.green : pct >= 75 ? NOVA.blue : NOVA.red;

  const safeCount = processed.filter((s: any) => parseFloat(s.percentage) >= 75).length;
  const riskCount = processed.length - safeCount;

  return (
    <div className="min-h-full pb-16 px-5 pt-6 space-y-6 relative overflow-hidden" style={{ background: NOVA.bg }}>
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/3 w-[350px] h-[350px] rounded-full pointer-events-none opacity-20 blur-[130px]" style={{ background: color }} />

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
              style={{ background: NOVA.blue, boxShadow: `0 0 12px ${NOVA.blue}` }}
            />
            <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ ...mono(), color: NOVA.blue }}>
              attendance radar
            </p>
          </div>
          <h1 className="text-[32px] font-black tracking-tight mt-1" style={{ color: NOVA.text }}>
            Showing Up &amp; Showing Out
          </h1>
        </div>

        {/* Quick Summary Pill */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md"
          style={{
            background: "rgba(18, 24, 38, 0.7)",
            border: `1px solid ${NOVA.borderStrong}`,
            boxShadow: `0 4px 12px rgba(0, 0, 0, 0.3)`,
          }}
        >
          <span className="text-[9.5px] font-black uppercase tracking-wider" style={{ ...mono(), color: NOVA.green }}>
            {safeCount} safe
          </span>
          {riskCount > 0 && (
            <>
              <span className="text-[9.5px] text-slate-600">·</span>
              <span className="text-[9.5px] font-black uppercase tracking-wider" style={{ ...mono(), color: NOVA.red }}>
                {riskCount} risk
              </span>
            </>
          )}
        </div>
      </motion.div>

      {/* Overall Summary Carbon Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRINGS.smooth}
        className="rounded-3xl p-6 relative overflow-hidden backdrop-blur-2xl transition-all duration-300 z-10"
        style={{
          ...carbonGlass(color, "40"),
          borderLeft: `4px solid ${color}`,
        }}
      >
        {/* Ambient Glowing Aura */}
        <div
          className="absolute -top-16 -right-16 w-44 h-44 rounded-full pointer-events-none opacity-25 blur-3xl transition-all duration-500"
          style={{ background: color }}
        />

        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9.5px] font-black uppercase tracking-[0.22em]" style={{ color: NOVA.faint }}>
                overall percentage
              </span>
              <span
                className="text-[8.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                style={{
                  ...mono(),
                  ...statusBadge(color, true),
                }}
              >
                {pct >= 85 ? "OPTIMAL" : pct >= 75 ? "ON TRACK" : "AT RISK"}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-[56px] font-black leading-none tracking-tight" style={{ ...mono(), color }}>
                {pct.toFixed(1)}
              </span>
              <span className="text-[20px] font-black" style={{ ...mono(), color: NOVA.faint }}>
                %
              </span>
            </div>
          </div>

          <div className="text-right space-y-2">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-md"
              style={{
                background: `${NOVA.blue}1a`,
                border: `1px solid ${NOVA.blue}44`,
                boxShadow: `0 0 12px ${NOVA.blue}18`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: NOVA.blue }} />
              <span className="text-[11px] font-black" style={{ ...mono(), color: NOVA.blue }}>
                {totalConducted} held
              </span>
            </div>
            <div>
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-md"
                style={{
                  background: `${NOVA.red}1a`,
                  border: `1px solid ${NOVA.red}44`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: NOVA.red }} />
                <span className="text-[11px] font-black" style={{ ...mono(), color: NOVA.red }}>
                  {totalAbsent} missed
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Overall Progress Meter */}
        <div className="mt-5 relative z-10">
          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ ...mono(), color: NOVA.faint }}>
            <span>Target: 75%</span>
            <span>Attended: {totalPresent}/{totalConducted}</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden p-0.5 relative" style={{ background: "rgba(255, 255, 255, 0.05)", border: `1px solid ${NOVA.border}` }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(pct, 100)}%` }}
              transition={{ type: "spring" as const, stiffness: 100, damping: 20 }}
              className="h-full rounded-full relative"
              style={{
                background: `linear-gradient(90deg, ${color}88 0%, ${color} 100%)`,
                boxShadow: `0 0 14px ${color}`,
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Subjects Attendance List */}
      <div className="space-y-3.5 relative z-10">
        {processed.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-3xl p-8 text-center backdrop-blur-2xl"
            style={{ ...carbonGlass(NOVA.blue, "20"), border: `1px dashed ${NOVA.borderStrong}` }}
          >
            <span className="material-symbols-outlined text-[36px] mb-2 opacity-40" style={{ color: NOVA.muted }}>
              analytics
            </span>
            <p className="text-[13px] font-bold" style={{ color: NOVA.muted }}>
              No attendance data available yet.
            </p>
          </motion.div>
        )}

        {processed.map((s: any, idx: number) => {
          const status = getStatus(parseFloat(s.percentage), s.conducted, s.present);
          const sc = status.safe ? (parseFloat(s.percentage) >= 85 ? NOVA.green : NOVA.orange) : NOVA.red;
          const isOpen = expanded === s.id;
          const bunked = s.conducted - s.present;

          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, ...SPRINGS.smooth }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                Haptics.selection();
                setExpanded(isOpen ? null : s.id);
              }}
              className="rounded-3xl p-5 cursor-pointer backdrop-blur-2xl transition-all duration-200"
              style={{
                ...carbonGlass(sc, isOpen ? "60" : "25"),
                borderLeft: `4px solid ${sc}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {s.code && (
                      <span
                        className="text-[9.5px] font-black tracking-widest px-2.5 py-0.5 rounded-md inline-block"
                        style={{
                          ...mono(),
                          color: sc,
                          background: `${sc}1a`,
                          border: `1px solid ${sc}44`,
                          boxShadow: `0 0 10px ${sc}15`,
                        }}
                      >
                        {s.code}
                      </span>
                    )}
                    <span
                      className="text-[8.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                      style={{
                        ...mono(),
                        ...statusBadge(sc),
                      }}
                    >
                      {status.safe ? (status.val > 0 ? `${status.val} bunks left` : "safe zone") : `attend ${status.val} more`}
                    </span>
                  </div>

                  <h3 className="text-[16.5px] font-black tracking-tight truncate mt-2" style={{ color: NOVA.text }}>
                    {cap(String(s.title || s.code || "subject"))}
                  </h3>

                  <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ ...mono(), color: NOVA.faint }}>
                    {s.present}/{s.conducted} classes attended
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className="flex flex-col items-end px-3 py-1.5 rounded-2xl backdrop-blur-md"
                    style={{
                      background: `${sc}1a`,
                      border: `1px solid ${sc}44`,
                    }}
                  >
                    <span className="text-[22px] font-black leading-none" style={{ ...mono(), color: sc }}>
                      {s.percentage}%
                    </span>
                  </div>
                  <motion.span
                    animate={{ rotate: isOpen ? 90 : 0 }}
                    transition={SPRINGS.smooth}
                    className="material-symbols-outlined text-[20px]"
                    style={{ color: NOVA.faint }}
                  >
                    chevron_right
                  </motion.span>
                </div>
              </div>

              {/* Attendance Progress Meter */}
              <div className="h-2 rounded-full mt-4 overflow-hidden p-0.5 relative" style={{ background: "rgba(255, 255, 255, 0.05)", border: `1px solid ${NOVA.border}` }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(parseFloat(s.percentage), 100)}%` }}
                  transition={{ type: "spring" as const, stiffness: 120, damping: 22 }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${sc}88 0%, ${sc} 100%)`,
                    boxShadow: `0 0 10px ${sc}77`,
                  }}
                />
              </div>

              {/* Accordion Detail Breakdown */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 14 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={SPRINGS.smooth}
                    className="overflow-hidden"
                  >
                    <div
                      className="pt-3.5 grid grid-cols-2 gap-2.5"
                      style={{ borderTop: `1px solid ${NOVA.borderStrong}` }}
                    >
                      <Mini label="classes missed" value={`${bunked} classes`} color={NOVA.red} icon="event_busy" />
                      <Mini label="radar status" value={status.safe ? "Safe Zone" : "Action Needed"} color={sc} icon="radar" />
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

function Mini({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <div
      className="rounded-2xl p-3 text-center backdrop-blur-lg flex items-center justify-center gap-2.5"
      style={{
        background: NOVA.panel2,
        border: `1px solid ${NOVA.borderStrong}`,
        boxShadow: `0 4px 14px rgba(0, 0, 0, 0.25)`,
      }}
    >
      <span className="material-symbols-outlined text-[18px]" style={{ color }}>
        {icon}
      </span>
      <div className="text-left min-w-0">
        <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: NOVA.faint }}>
          {label}
        </p>
        <p className="text-[12px] font-black mt-0.5 truncate" style={{ ...mono(), color }}>
          {value}
        </p>
      </div>
    </div>
  );
}
