"use client";
import React, { useMemo } from "react";
import { NOVA, mono, cap } from "./tokens";
import { processAndSortMarks, buildCourseMap, getAcronym } from "@/utils/marks/marksLogic";

const CODE_COLORS = [NOVA.lime, NOVA.blue, NOVA.orange, NOVA.gold, NOVA.purple, NOVA.cyan, NOVA.pink];

function gradeFor(pct: number) {
  if (pct >= 91) return { g: "O", c: NOVA.green };
  if (pct >= 81) return { g: "A+", c: NOVA.green };
  if (pct >= 71) return { g: "A", c: NOVA.blue };
  if (pct >= 61) return { g: "B+", c: NOVA.gold };
  if (pct >= 50) return { g: "B", c: NOVA.orange };
  return { g: "F", c: NOVA.red };
}

export default function NovaMarks({ data }: { data: any }) {
  const courseMap = useMemo(() => buildCourseMap(data), [data]);
  const subjects = useMemo(() => processAndSortMarks(data?.marks || [], courseMap), [data?.marks, courseMap]);

  const valid = subjects.filter((s: any) => !s.isNA && s.totalMax !== undefined && s.totalMax > 0);
  const avg = valid.length > 0
    ? Math.round((valid.reduce((a: number, s: any) => a + ((s.totalGot ?? 0) / (s.totalMax ?? 1)) * 100, 0) / valid.length) * 10) / 10
    : 0;

  return (
    <div className="min-h-full pb-10" style={{ background: NOVA.bg }}>
      <section className="px-5 pt-7">
        <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ ...mono(), color: NOVA.lime }}>
          courses & marks
        </p>
        <h1 className="text-[30px] font-black tracking-tight mt-1.5" style={{ color: NOVA.text }}>
          Academic Load
        </h1>

        <div
          className="rounded-xl p-5 mt-5 flex items-center justify-between"
          style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderTop: `3px solid ${NOVA.blue}` }}
        >
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: NOVA.faint }}>
              internal average
            </span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-[40px] font-black leading-none" style={{ ...mono(), color: NOVA.blue }}>{avg}</span>
              <span className="text-[15px] font-black" style={{ ...mono(), color: NOVA.faint }}>%</span>
            </div>
          </div>
          <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${NOVA.blue}1a`, border: `1px solid ${NOVA.blue}44` }}>
            <span className="material-symbols-outlined text-[22px]" style={{ color: NOVA.blue }}>ssid_chart</span>
          </span>
        </div>
      </section>

      <section className="px-5 mt-6 space-y-2.5">
        {subjects.length === 0 && (
          <p className="text-[13px] font-semibold" style={{ color: NOVA.muted }}>no marks data yet.</p>
        )}
        {subjects.map((s: any, idx: number) => {
          const pct = s.totalMax ? Math.round(((s.totalGot ?? 0) / s.totalMax) * 100) : 0;
          const { g, c } = gradeFor(pct);
          const cc = CODE_COLORS[idx % CODE_COLORS.length];
          return (
            <div
              key={s.id ?? idx}
              className="rounded-xl p-4"
              style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderLeft: `3px solid ${c}` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded"
                      style={{ ...mono(), color: cc, background: `${cc}14`, border: `1px solid ${cc}44` }}
                    >
                      {s.code || getAcronym(s.title) || "SUB"}
                    </span>
                    {s.isPractical && (
                      <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ ...mono(), color: NOVA.ink, background: NOVA.gold }}>
                        lab
                      </span>
                    )}
                  </div>
                  <p className="text-[15px] font-black tracking-tight truncate mt-1" style={{ color: NOVA.text }}>
                    {cap(String(s.title || s.code || "subject"))}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[18px] font-black" style={{ ...mono(), color: c }}>{g}</span>
                  <p className="text-[10px] font-bold mt-0.5" style={{ ...mono(), color: NOVA.muted }}>
                    {s.totalGot ?? 0}/{s.totalMax ?? 0}
                  </p>
                </div>
              </div>
              <div className="h-1.5 rounded-full mt-3 overflow-hidden" style={{ background: NOVA.border }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: c, boxShadow: `0 0 8px ${c}` }} />
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
