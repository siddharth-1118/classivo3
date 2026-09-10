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
    <div className="min-h-full pb-14 px-5 pt-6 space-y-6" style={{ background: NOVA.bg }}>
      {/* Header section */}
      <div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: NOVA.lime, boxShadow: `0 0 12px ${NOVA.lime}` }} />
          <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ ...mono(), color: NOVA.lime }}>
            courses & marks
          </p>
        </div>
        <h1 className="text-[32px] font-black tracking-tight mt-1" style={{ color: NOVA.text }}>
          Academic Load
        </h1>
      </div>

      {/* Internal Average Card */}
      <div
        className="rounded-2xl p-5 flex items-center justify-between backdrop-blur-xl relative overflow-hidden transition-transform hover:scale-[1.01]"
        style={{
          background: NOVA.panel,
          border: `1px solid ${NOVA.borderStrong}`,
          boxShadow: `0 12px 36px 0 rgba(0, 0, 0, 0.4), 0 0 24px 0 ${NOVA.blue}20`,
        }}
      >
        <div
          className="absolute -top-12 -left-12 w-32 h-32 rounded-full pointer-events-none opacity-20 blur-2xl"
          style={{ background: NOVA.blue }}
        />
        <div className="relative z-10">
          <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: NOVA.faint }}>
            internal average
          </span>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-[44px] font-black leading-none tracking-tight" style={{ ...mono(), color: NOVA.blue }}>
              {avg}
            </span>
            <span className="text-[16px] font-black" style={{ ...mono(), color: NOVA.faint }}>
              %
            </span>
          </div>
        </div>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center relative z-10"
          style={{
            background: `linear-gradient(135deg, ${NOVA.blue}20 0%, ${NOVA.cyan}20 100%)`,
            border: `1px solid ${NOVA.blue}40`,
            boxShadow: `0 0 20px ${NOVA.blue}30`,
          }}
        >
          <span className="material-symbols-outlined text-[24px]" style={{ color: NOVA.blue }}>
            ssid_chart
          </span>
        </div>
      </div>

      {/* Subjects List */}
      <div className="space-y-3">
        {subjects.length === 0 && (
          <div
            className="rounded-2xl p-6 text-center backdrop-blur-lg"
            style={{ background: NOVA.panel, border: `1px dashed ${NOVA.border}` }}
          >
            <span className="material-symbols-outlined text-[32px] mb-2 opacity-40" style={{ color: NOVA.muted }}>
              auto_stories
            </span>
            <p className="text-[13px] font-semibold" style={{ color: NOVA.muted }}>
              No internal marks data available yet.
            </p>
          </div>
        )}

        {subjects.map((s: any, idx: number) => {
          const pct = s.totalMax ? Math.round(((s.totalGot ?? 0) / s.totalMax) * 100) : 0;
          const { g, c } = gradeFor(pct);
          const cc = CODE_COLORS[idx % CODE_COLORS.length];

          return (
            <div
              key={s.id ?? idx}
              className="rounded-2xl p-4.5 backdrop-blur-xl transition-all duration-200 hover:border-slate-500/30"
              style={{
                background: NOVA.panel,
                border: `1px solid ${NOVA.border}`,
                boxShadow: `0 8px 24px rgba(0, 0, 0, 0.25), inset 3px 0 0 0 ${c}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[9.5px] font-black tracking-widest px-2 py-0.5 rounded-md"
                      style={{
                        ...mono(),
                        color: cc,
                        background: `${cc}18`,
                        border: `1px solid ${cc}33`,
                      }}
                    >
                      {s.code || getAcronym(s.title) || "SUB"}
                    </span>
                    {s.isPractical && (
                      <span
                        className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                        style={{ ...mono(), color: NOVA.ink, background: NOVA.gold }}
                      >
                        lab
                      </span>
                    )}
                  </div>
                  <h3 className="text-[15px] font-black tracking-tight truncate mt-1.5" style={{ color: NOVA.text }}>
                    {cap(String(s.title || s.code || "subject"))}
                  </h3>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl font-black text-[15px] shadow-lg"
                    style={{
                      ...mono(),
                      color: c,
                      background: `${c}15`,
                      border: `1px solid ${c}44`,
                    }}
                  >
                    {g}
                  </div>
                  <p className="text-[10px] font-bold mt-1" style={{ ...mono(), color: NOVA.muted }}>
                    {s.totalGot ?? 0}/{s.totalMax ?? 0}
                  </p>
                </div>
              </div>

              {/* Score meter */}
              <div className="h-2 rounded-full mt-3.5 overflow-hidden" style={{ background: "rgba(255, 255, 255, 0.06)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    background: `linear-gradient(90deg, ${c}88 0%, ${c} 100%)`,
                    boxShadow: `0 0 10px ${c}66`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
