"use client";
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, MapPin, User, Clock, Search } from "lucide-react";
import { useApp } from "@/context/AppContext";

interface CourseDetailsPageProps {
  isOpen: boolean;
  onClose: () => void;
}

const normalize = (str: string) => (str || "").toLowerCase().trim();

export default function CourseDetailsPage({
  isOpen,
  onClose,
}: CourseDetailsPageProps) {
  const { userData } = useApp();
  const [query, setQuery] = useState("");

  const courses = useMemo(() => {
    const raw = (userData?.courses || {}) as Record<string, any>;
    return Object.values(raw).filter(
      (c: any, idx: number, arr: any[]) =>
        c && arr.findIndex((x: any) => x?.code === c.code) === idx
    );
  }, [userData]);

  const stats = useMemo(() => {
    const totalCredits = courses.reduce(
      (acc: number, c: any) => acc + (parseFloat(c.credits) || 0),
      0
    );
    const types = new Set(
      courses.map((c: any) => (c.raw_type || c.type || "").toLowerCase()).filter(Boolean)
    );
    return { totalCredits, typeCount: types.size };
  }, [courses]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return courses;
    return courses.filter((c: any) => {
      const code = normalize(c.code);
      const name = normalize(c.name);
      const faculty = normalize(c.faculty);
      const type = normalize(c.raw_type || c.type);
      return code.includes(q) || name.includes(q) || faculty.includes(q) || type.includes(q);
    });
  }, [courses, query]);

  const groupedCourses = useMemo(() => {
    return filtered.reduce((acc: Record<string, any[]>, current: any) => {
      const creds = current.credits || "0";
      if (!acc[creds]) acc[creds] = [];
      acc[creds].push(current);
      return acc;
    }, {});
  }, [filtered]);

  const sortedCreditGroups = Object.keys(groupedCourses).sort(
    (a, b) => Number(b) - Number(a)
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 26, stiffness: 210 }}
          className="fixed inset-0 bg-[#0f131f] text-[#dfe1f4] z-[2000] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <header className="pt-14 px-6 pb-5 shrink-0 border-b border-white/5 bg-slate-950/30 backdrop-blur-md">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform shrink-0"
                >
                  <X className="w-5 h-5" strokeWidth={2.5} />
                </button>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6EE7F7]">
                    Syllabus Explorer
                  </p>
                  <h1 className="text-2xl font-black lowercase tracking-tighter bg-gradient-to-r from-white via-white to-cyan-200 bg-clip-text text-transparent leading-tight">
                    Courses
                  </h1>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0"
                style={{
                  background: "rgba(110,231,247,0.1)",
                  color: "#6ee7f7",
                  border: "1px solid rgba(110,231,247,0.2)",
                }}
              >
                {filtered.length} {filtered.length === 1 ? "course" : "courses"}
              </span>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              <StatPill label="Courses" value={String(courses.length)} />
              <StatPill label="Total Credits" value={stats.totalCredits ? String(stats.totalCredits) : "—"} />
              <StatPill label="Types" value={stats.typeCount ? String(stats.typeCount) : "—"} />
            </div>

            {/* Search */}
            <div className="relative mt-4">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by code, name, faculty or type..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-400/40 focus:bg-white/[0.06] transition-all"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </header>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-6 pb-44 space-y-10">
            {sortedCreditGroups.length > 0 ? (
              sortedCreditGroups.map((credits) => (
                <section key={credits}>
                  <div className="flex items-center gap-4 px-1 mb-5">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35 whitespace-nowrap">
                      {credits} credit courses
                    </h2>
                    <div className="h-px flex-1 bg-white/5" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/25">
                      {groupedCourses[credits].length}
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {groupedCourses[credits].map((course: any, idx: number) => (
                      <CourseCard key={course.code} course={course} index={idx} />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-white/30 space-y-4">
                <BookOpen size={44} opacity={0.25} />
                <p className="text-sm font-medium lowercase">
                  {query ? `no courses match "${query}"` : "no courses found"}
                </p>
              </div>
            )}
          </div>

          {/* Sticky footer */}
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0f131f] via-[#0f131f]/95 to-transparent pointer-events-none z-10">
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm active:scale-95 transition-all pointer-events-auto shadow-2xl"
              style={{
                background: "linear-gradient(135deg, #22d3ee 0%, #818cf8 100%)",
                color: "#0f131f",
                boxShadow: "0 4px 24px rgba(34,211,238,0.25)",
              }}
            >
              Back to Settings
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-4 py-3 flex flex-col gap-1"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">
        {label}
      </span>
      <span className="text-lg font-black text-white leading-none">{value}</span>
    </div>
  );
}

function CourseCard({ course, index }: { course: any; index: number }) {
  const typeLabel = (course.raw_type || course.type || "—").toUpperCase();
  const credits = course.credits || "—";
  const room = course.room || course.venue || "N/A";
  const faculty = course.faculty || "—";
  const slot = course.slot || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.35 }}
      className="relative rounded-3xl overflow-hidden group"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      }}
    >
      {/* Accent edge */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] opacity-60 group-hover:opacity-100 transition-opacity"
        style={{ background: "linear-gradient(180deg, #6EE7F7, #818cf8)" }}
      />
      {/* Glow orb */}
      <div className="absolute top-0 right-0 w-28 h-28 rounded-full blur-3xl pointer-events-none opacity-40"
        style={{ background: "radial-gradient(circle, rgba(110,231,247,0.18) 0%, transparent 70%)" }}
      />

      <div className="relative p-5 pl-6">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] font-black tracking-widest text-cyan-300/90 uppercase">
                {course.code || "—"}
              </span>
              {course.raw_type && (
                <span className="px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase"
                  style={{
                    background: "rgba(129,140,248,0.12)",
                    color: "#a5b4fc",
                    border: "1px solid rgba(129,140,248,0.25)",
                  }}
                >
                  {typeLabel}
                </span>
              )}
            </div>
            <h3 className="text-xl font-black leading-tight tracking-tighter lowercase text-white mt-1.5 line-clamp-2">
              {String(course.name || "Unknown Course").toLowerCase()}
            </h3>
          </div>
          <span
            className="shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest"
            style={{
              background: "rgba(226,201,116,0.1)",
              color: "#E2C974",
              border: "1px solid rgba(226,201,116,0.22)",
            }}
          >
            {credits} cr
          </span>
        </div>

        {/* Bottom row */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 pt-4 border-t border-white/5">
          <Info icon={<User size={13} />} label="Faculty" value={faculty} />
          <Info icon={<MapPin size={13} />} label="Venue" value={room} />
          {slot && <Info icon={<Clock size={13} />} label="Slot" value={slot.toUpperCase()} />}
        </div>
      </div>
    </motion.div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-white/25 shrink-0">{icon}</span>
      <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/30 shrink-0">
        {label}
      </span>
      <span className="text-xs font-bold text-white/80 truncate capitalize">{value}</span>
    </div>
  );
}
