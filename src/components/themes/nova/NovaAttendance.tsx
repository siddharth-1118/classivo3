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
    <div className="min-h-full pb-10" style={{ background: NOVA.bg }}>
      <section className="px-5 pt-7">
        <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ ...mono(), color: NOVA.lime }}>
          attendance radar
        </p>
        <h1 className="text-[30px] font-black tracking-tight mt-1.5" style={{ color: NOVA.text }}>
          Showing Up &amp; Showing Out
        </h1>

        {/* Overall block */}
        <div
          className="rounded-xl p-5 mt-5 relative overflow-hidden"
          style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderLeft: `3px solid ${color}` }}
        >
          <div className="flex items-end justify-between">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: NOVA.faint }}>
                overall
              </span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-[52px] font-black leading-none" style={{ ...mono(), color }}>{pct.toFixed(1)}</span>
                <span className="text-[18px] font-black" style={{ ...mono(), color: NOVA.faint }}>%</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold" style={{ ...mono(), color: NOVA.muted }}>{totalConducted} held</p>
              <p className="text-[11px] font-bold mt-0.5" style={{ ...mono(), color: NOVA.red }}>{totalAbsent} missed</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 mt-6 space-y-2.5">
        {processed.length === 0 && (
          <p className="text-[13px] font-semibold" style={{ color: NOVA.muted }}>no attendance data yet.</p>
        )}
        {processed.map((s: any) => {
          const status = getStatus(parseFloat(s.percentage), s.conducted, s.present);
          const sc = status.safe ? (parseFloat(s.percentage) >= 85 ? NOVA.green : NOVA.orange) : NOVA.red;
          const isOpen = expanded === s.id;
          const bunked = s.conducted - s.present;
          return (
            <div
              key={s.id}
              onClick={() => { Haptics.selection(); setExpanded(isOpen ? null : s.id); }}
              className="rounded-xl p-4 cursor-pointer transition-all active:scale-[0.99]"
              style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderLeft: `3px solid ${sc}` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {s.code && (
                    <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded inline-block" style={{ ...mono(), color: sc, background: `${sc}14`, border: `1px solid ${sc}44` }}>
                      {s.code}
                    </span>
                  )}
                  <p className="text-[15px] font-black tracking-tight truncate mt-1" style={{ color: NOVA.text }}>
                    {cap(String(s.title || s.code || "subject"))}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-widest mt-1" style={{ ...mono(), color: NOVA.faint }}>
                    {s.present}/{s.conducted} · {status.val} to {status.safe ? "bunk" : "attend"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[18px] font-black" style={{ ...mono(), color: sc }}>{s.percentage}%</span>
                  <span className="material-symbols-outlined text-[16px]" style={{ color: NOVA.faint }}>chevron_right</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full mt-3 overflow-hidden" style={{ background: NOVA.border }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(parseFloat(s.percentage), 100)}%`, background: sc, boxShadow: `0 0 8px ${sc}` }} />
              </div>
              {isOpen && (
                <div className="mt-3 pt-3 grid grid-cols-2 gap-2" style={{ borderTop: `1px solid ${NOVA.border}` }}>
                  <Mini label="bunked" value={`${bunked} classes`} color={NOVA.red} />
                  <Mini label="status" value={status.safe ? "safe zone" : "action needed"} color={sc} />
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: NOVA.bg, border: `1px solid ${NOVA.border}` }}>
      <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: NOVA.faint }}>{label}</p>
      <p className="text-[12px] font-black mt-0.5" style={{ ...mono(), color }}>{value}</p>
    </div>
  );
}
