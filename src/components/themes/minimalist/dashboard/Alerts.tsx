"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Plus, Trash2, CloudLightning, Sun, Cloud, Wind } from "lucide-react";
import { Haptics } from "@/utils/shared/haptics";

interface AlertsProps {
  isOpen: boolean;
  onClose: () => void;
  exams: any[];
  upcomingBreaks: any[];
}

export default function Alerts({ isOpen, onClose, exams, upcomingBreaks }: AlertsProps) {
  const [personalNotes, setPersonalNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [canDragClose, setCanDragClose] = useState(true);
  const [activeTab, setActiveTab] = useState<"storms" | "skies" | "clouds">("storms");

  useEffect(() => {
    const savedPrivate = localStorage.getItem("classivo_private_notes");
    if (savedPrivate) {
      try {
        setPersonalNotes(JSON.parse(savedPrivate));
      } catch {}
    }
  }, []);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const newNoteObj = { id: Date.now(), text: newNote, date: "just now" };
    const updatedNotes = [newNoteObj, ...personalNotes];
    setPersonalNotes(updatedNotes);
    localStorage.setItem("classivo_private_notes", JSON.stringify(updatedNotes));
    setNewNote("");
    window.dispatchEvent(new Event("private_notes_updated"));
  };

  const handleDeleteNote = (id: number) => {
    const updated = personalNotes.filter((n) => n.id !== id);
    setPersonalNotes(updated);
    localStorage.setItem("classivo_private_notes", JSON.stringify(updated));
    window.dispatchEvent(new Event("private_notes_updated"));
  };

  const handleAlertsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setCanDragClose(e.currentTarget.scrollTop <= 0);
  };

  const tabs = [
    { id: "storms", label: "storm front", icon: <CloudLightning size={16} />, count: exams.length },
    { id: "skies", label: "clear skies", icon: <Sun size={16} />, count: upcomingBreaks.length },
    { id: "clouds", label: "personal cloud", icon: <Cloud size={16} />, count: personalNotes.length },
  ];

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 400, damping: 25 },
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          drag={canDragClose ? "y" : false}
          dragDirectionLock
          dragConstraints={{ top: 0, bottom: 500 }}
          dragElastic={{ top: 0, bottom: 0.8 }}
          onDragEnd={(e, info) => {
            if (info.offset.y > 100 || info.velocity.y > 500) {
              Haptics.medium();
              onClose();
            }
          }}
          className="fixed inset-0 bg-theme-bg z-[60] flex flex-col px-6 pt-10 pb-6 overflow-hidden"
          style={{ backgroundImage: "radial-gradient(circle at 50% -20%, rgba(139, 92, 246, 0.05), transparent 70%)" }}
        >
          <div className="w-12 h-1.5 bg-theme-text-10 rounded-full mx-auto mb-6 shrink-0" />
          
          {/* Header */}
          <div className="flex justify-between items-start w-full shrink-0 mb-6 relative z-10">
            <div className="flex flex-col">
              <span className="text-[32px] leading-[1] font-black uppercase tracking-[0.15em] text-theme-text">
                FORECAST
              </span>
              <span className="text-[22px] font-caveat lowercase tracking-wide text-theme-muted mt-1 opacity-70 flex items-center gap-2">
                <Wind size={18} /> academic weather radar
              </span>
            </div>
            <button
              onClick={() => { Haptics.selection(); onClose(); }}
              className="w-10 h-10 rounded-full bg-theme-surface flex items-center justify-center text-theme-text active:scale-95 transition-all shrink-0 border border-theme-subtle"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>

          {/* Segmented Control */}
          <div className="flex p-1 bg-theme-surface border border-theme-subtle rounded-2xl mb-6 shrink-0 relative z-10">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { Haptics.light(); setActiveTab(tab.id as any); }}
                  className="flex-1 py-2.5 relative flex items-center justify-center gap-2 z-10"
                >
                  {isActive && (
                    <motion.div
                      layoutId="forecastTabIndicator"
                      className="absolute inset-0 bg-theme-card rounded-xl shadow-sm border border-theme-subtle"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <div className={`relative z-10 flex items-center gap-1.5 transition-colors duration-300 ${isActive ? 'text-theme-text' : 'text-theme-muted opacity-60'}`}>
                    {tab.icon}
                    <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">{tab.label}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest sm:hidden">{tab.label.split(" ")[0]}</span>
                    {tab.count > 0 && (
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${isActive ? 'bg-theme-text text-theme-bg' : 'bg-theme-text-10'}`}>
                        {tab.count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div onScroll={handleAlertsScroll} className="flex-1 overflow-y-auto no-scrollbar relative z-10 pb-4">
            <AnimatePresence mode="wait">
              {/* STORMS (EXAMS) */}
              {activeTab === "storms" && (
                <motion.div
                  key="storms"
                  initial="hidden" animate="show" exit="exit"
                  variants={{ show: { transition: { staggerChildren: 0.1 } } }}
                  className="flex flex-col gap-4"
                >
                  {exams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                      <Cloud size={48} strokeWidth={1} className="mb-4" />
                      <span className="text-[28px] font-caveat">clear skies ahead</span>
                      <span className="text-[12px] font-bold uppercase tracking-widest text-theme-muted mt-2">no upcoming assessments</span>
                    </div>
                  ) : (
                    exams.map((alert) => (
                      <motion.div key={alert.id} variants={itemVariants} className="bg-theme-card border-[#8b5cf6]/30 border-[1.5px] rounded-3xl p-5 flex flex-col relative overflow-hidden shadow-[0_8px_30px_rgba(139,92,246,0.12)]">
                        <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full bg-[#8b5cf6]/10 pointer-events-none flex items-start justify-end p-4">
                            <CloudLightning size={40} className="text-[#8b5cf6]/20" />
                        </div>
                        <div className="flex items-center gap-3 mb-4 z-10">
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 bg-[#8b5cf6] text-white shadow-[0_0_10px_rgba(139,92,246,0.5)]">
                            storm warning
                          </span>
                          <span className="text-[12px] font-bold text-[#8b5cf6] tracking-wider uppercase">
                            {alert.date}
                          </span>
                        </div>
                        <span className="text-[20px] font-black tracking-wide text-theme-text leading-tight mb-4 z-10">
                          {alert.title}
                        </span>
                        <div className="flex flex-col gap-2.5 z-10">
                          {alert.desc.split(" / ").map((sub: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 bg-theme-surface border-theme-subtle rounded-2xl p-3 border">
                              {alert.desc.includes("/") && <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-[#8b5cf6]" />}
                              <span className="text-[15px] font-bold text-theme-text lowercase leading-snug">{sub.trim()}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}

              {/* SKIES (HOLIDAYS) */}
              {activeTab === "skies" && (
                <motion.div
                  key="skies"
                  initial="hidden" animate="show" exit="exit"
                  variants={{ show: { transition: { staggerChildren: 0.1 } } }}
                  className="flex flex-col gap-4"
                >
                  {upcomingBreaks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                      <Wind size={48} strokeWidth={1} className="mb-4" />
                      <span className="text-[28px] font-caveat">the grind continues</span>
                      <span className="text-[12px] font-bold uppercase tracking-widest text-theme-muted mt-2">no upcoming holidays</span>
                    </div>
                  ) : (
                    upcomingBreaks.map((alert) => (
                      <motion.div key={alert.id} variants={itemVariants} className="bg-theme-card border-[#F59E0B]/30 border-[1.5px] rounded-3xl p-5 flex flex-col relative overflow-hidden shadow-[0_8px_30px_rgba(245,158,11,0.12)]">
                        <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full bg-[#F59E0B]/10 pointer-events-none flex items-start justify-end p-4">
                            <Sun size={40} className="text-[#F59E0B]/20" />
                        </div>
                        <div className="flex items-center gap-3 mb-4 z-10">
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 bg-[#F59E0B] text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                            sunny days
                          </span>
                          <span className="text-[12px] font-bold text-[#F59E0B] tracking-wider uppercase">
                            {alert.date}
                          </span>
                        </div>
                        <span className="text-[20px] font-black tracking-wide text-theme-text leading-tight mb-4 z-10">
                          {alert.title}
                        </span>
                        <div className="flex flex-col gap-2.5 z-10">
                          {alert.desc.split(" / ").map((sub: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 bg-theme-surface border-theme-subtle rounded-2xl p-3 border">
                              {alert.desc.includes("/") && <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-[#F59E0B]" />}
                              <span className="text-[15px] font-bold text-theme-text lowercase leading-snug">{sub.trim()}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}

              {/* CLOUDS (NOTES) */}
              {activeTab === "clouds" && (
                <motion.div
                  key="clouds"
                  initial="hidden" animate="show" exit="exit"
                  variants={{ show: { transition: { staggerChildren: 0.1 } } }}
                  className="flex flex-col gap-4"
                >
                  {personalNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                      <Cloud size={48} strokeWidth={1} className="mb-4" />
                      <span className="text-[28px] font-caveat">empty mind</span>
                      <span className="text-[12px] font-bold uppercase tracking-widest text-theme-muted mt-2">no personal notes</span>
                    </div>
                  ) : (
                    personalNotes.map((note) => (
                      <motion.div key={note.id} variants={itemVariants} className="bg-theme-card border-[#38BDF8]/30 border-[1.5px] rounded-3xl p-5 flex flex-col relative overflow-hidden shadow-[0_8px_30px_rgba(56,189,248,0.1)] group">
                        <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full bg-[#38BDF8]/5 pointer-events-none flex items-start justify-end p-4">
                            <Cloud size={40} className="text-[#38BDF8]/10" />
                        </div>
                        <button
                          onClick={() => { Haptics.selection(); handleDeleteNote(note.id); }}
                          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-theme-surface text-theme-subtle flex items-center justify-center hover:text-[#FF4D4D] hover:bg-[#FF4D4D]/10 active:scale-95 transition-all z-10 border border-theme-subtle"
                        >
                          <Trash2 size={14} />
                        </button>
                        <span className="text-[24px] font-bold text-theme-text lowercase leading-snug mb-3 pr-8 z-10 font-caveat tracking-wide">
                          "{note.text}"
                        </span>
                        <span className="text-[10px] font-bold tracking-widest uppercase text-[#38BDF8] z-10">
                          {note.date}
                        </span>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Note Input Area */}
          <AnimatePresence>
            {activeTab === "clouds" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mt-auto shrink-0 pt-4 bg-theme-bg z-20 relative border-t border-theme-subtle"
              >
                <div className="flex items-center gap-2 p-1.5 rounded-[24px] bg-theme-surface border-[#38BDF8]/30 border shadow-[0_0_20px_rgba(56,189,248,0.05)] transition-all focus-within:border-[#38BDF8]">
                  <div className="w-12 h-12 rounded-[20px] flex items-center justify-center bg-theme-surface text-[#38BDF8] shrink-0 border border-theme-subtle">
                    <Lock size={18} strokeWidth={2.5} />
                  </div>
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                    placeholder="add to your personal cloud..."
                    className="flex-1 bg-transparent outline-none px-2 text-[20px] font-bold placeholder:font-medium placeholder:opacity-40 lowercase text-theme-text font-caveat tracking-wide"
                  />
                  <button
                    onClick={() => { Haptics.light(); handleAddNote(); }}
                    className="w-12 h-12 rounded-[20px] flex items-center justify-center active:scale-95 transition-all shrink-0 bg-[#38BDF8] text-white shadow-[0_4px_10px_rgba(56,189,248,0.4)]"
                  >
                    <Plus size={24} strokeWidth={3} />
                  </button>
                </div>
                <div className="flex justify-center mt-3 pb-2">
                  <span className="text-[10px] font-bold tracking-[0.15em] lowercase text-theme-muted opacity-70">
                    fully encrypted locally. never sent to server.
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
