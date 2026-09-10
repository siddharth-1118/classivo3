"use client";
import React, { useMemo, useState } from "react";
import { NOVA, mono, cap } from "./tokens";
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
  const totalAbsent = base.reduce((a: number, s: any) => a + ((s.conducted || 0) - (s.present || 0)), 0);

  const pct = Number(stats.pct);
  const color = pct >= 85 ? NOVA.green : pct >= 75 ? NOVA.orange : NOVA.red;

  return (
    <div className="min-h-full pb-14 px-5 pt-6 space-y-6" style={{ background: NOVA.bg }}>
      {/* Header section */}
      <div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: NOVA.blue, boxShadow: `0 0 12px ${NOVA.blue}` }} />
          <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ ...mono(), color: NOVA.blue }}>
            attendance radar
          </p>
        </div>
        <h1 className="text-[32px] font-black tracking-tight mt-1" style={{ color: NOVA.text }}>
          Showing Up &amp; Showing Out
        </h1>
      </div>

      {/* Overall Summary Card */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl transition-transform hover:scale-[1.01]"
        style={{
          background: NOVA.panel,
          border: `1px solid ${NOVA.borderStrong}`,
          boxShadow: `0 12px 36px 0 rgba(0, 0, 0, 0.4), 0 0 24px 0 ${color}20`,
        }}
      >
        <div
          className="absolute -top-12 -right-12 w-36 h-36 rounded-full pointer-events-none opacity-20 blur-2xl"
          style={{ background: color }}
        />
        <div className="flex items-end justify-between relative z-10">
          <div>
            <span className="text-[9.5px] font-black uppercase tracking-[0.22em]" style={{ color: NOVA.faint }}>
              overall percentage
            </span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-[54px] font-black leading-none tracking-tight" style={{ ...mono(), color }}>
                {pct.toFixed(1)}
              </span>
              <span className="text-[18px] font-black" style={{ ...mono(), color: NOVA.faint }}>
                %
              </span>
            </div>
          </div>

          <div className="text-right space-y-1">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl"
              style={{ background: `${NOVA.blue}15`, border: `1px solid ${NOVA.blue}33` }}
            >
              <span className="text-[11px] font-black" style={{ ...mono(), color: NOVA.blue }}>
                {totalConducted} held
              </span>
            </div>
            <div>
              <span className="text-[11px] font-black" style={{ ...mono(), color: NOVA.red }}>
                {totalAbsent} missed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subjects Attendance List */}
      <div className="space-y-3">
        {processed.length === 0 && (
          <div
            className="rounded-2xl p-6 text-center backdrop-blur-lg"
            style={{ background: NOVA.panel, border: `1px dashed ${NOVA.border}` }}
          >
            <span className="material-symbols-outlined text-[32px] mb-2 opacity-40" style={{ color: NOVA.muted }}>
              analytics
            </span>
            <p className="text-[13px] font-semibold" style={{ color: NOVA.muted }}>
              No attendance data available yet.
            </p>
          </div>
        )}

        {processed.map((s: any) => {
          const status = getStatus(parseFloat(s.percentage), s.conducted, s.present);
          const sc = status.safe ? (parseFloat(s.percentage) >= 85 ? NOVA.green : NOVA.orange) : NOVA.red;
          const isOpen = expanded === s.id;
          const bunked = s.conducted - s.present;

          return (
            <div
              key={s.id}
              onClick={() => {
                Haptics.selection();
                setExpanded(isOpen ? null : s.id);
              }}
              className="rounded-2xl p-4.5 cursor-pointer backdrop-blur-xl transition-all duration-200 active:scale-[0.99] hover:border-slate-500/30"
              style={{
                background: NOVA.panel,
                border: `1px solid ${NOVA.border}`,
                boxShadow: `0 8px 24px rgba(0, 0, 0, 0.25), inset 3px 0 0 0 ${sc}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {s.code && (
                    <span
                      className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md inline-block mb-1"
                      style={{
                        ...mono(),
                        color: sc,
                        background: `${sc}18`,
                        border: `1px solid ${sc}33`,
                      }}
                    >
                      {s.code}
                    </span>
                  )}
                  <h3 className="text-[15px] font-black tracking-tight truncate" style={{ color: NOVA.text }}>
                    {cap(String(s.title || s.code || "subject"))}
                  </h3>
                  <p className="text-[9.5px] font-bold uppercase tracking-widest mt-1" style={{ ...mono(), color: NOVA.faint }}>
                    {s.present}/{s.conducted} classes · {status.val} to {status.safe ? "bunk" : "attend"}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[19px] font-black" style={{ ...mono(), color: sc }}>
                    {s.percentage}%
                  </span>
                  <span
                    className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                      isOpen ? "rotate-90" : ""
                    }`}
                    style={{ color: NOVA.faint }}
                  >
                    chevron_right
                  </span>
                </div>
              </div>

              {/* Attendance Progress Meter */}
              <div className="h-2 rounded-full mt-3.5 overflow-hidden" style={{ background: "rgba(255, 255, 255, 0.06)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(parseFloat(s.percentage), 100)}%`,
                    background: `linear-gradient(90deg, ${sc}88 0%, ${sc} 100%)`,
                    boxShadow: `0 0 10px ${sc}66`,
                  }}
                />
              </div>

              {isOpen && (
                <div
                  className="mt-3.5 pt-3.5 grid grid-cols-2 gap-2.5"
                  style={{ borderTop: `1px solid ${NOVA.border}` }}
                >
                  <Mini label="bunked" value={`${bunked} classes`} color={NOVA.red} />
                  <Mini label="status" value={status.safe ? "safe zone" : "action needed"} color={sc} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-xl p-2.5 text-center backdrop-blur-md"
      style={{ background: NOVA.panel2, border: `1px solid ${NOVA.border}` }}
    >
      <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: NOVA.faint }}>
        {label}
      </p>
      <p className="text-[12px] font-black mt-0.5" style={{ ...mono(), color }}>
        {value}
      </p>
    </div>
  );
}
