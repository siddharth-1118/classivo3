"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Github, Instagram, Linkedin } from "lucide-react";
import { NOVA, mono } from "@/components/themes/nova/tokens";

const BEZIER = [0.34, 0.15, 0.16, 0.96] as const;

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: BEZIER } },
};

const Section = ({ n, label, children }: { n: string; label: string; children: React.ReactNode }) => (
  <section>
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[9px] font-black tracking-widest" style={{ ...mono(), color: NOVA.orange }}>
        {n}
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: NOVA.muted }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: NOVA.border }} />
    </div>
    {children}
  </section>
);

// ── Edit me ─────────────────────────────────────────────────────────────
const DEVELOPER = {
  name: "Sai Siddharth Vooka",
  initials: "SV",
  role: "Founder & Full-Stack Developer",
  bio: "Building Classivo as a privacy-first companion for SRMIST students — local-first data, direct secure sync, and a premium mobile experience.",
  github: "https://github.com/siddharth-1118",
  linkedin: "https://www.linkedin.com/in/sai-siddharth-ba0a92369",
  instagram: "https://www.instagram.com/saisiddharth2007/",
};

// ── Helpers ────────────────────────────────────────────────────────────
const HELPERS = [
  {
    name: "Hemanth Raju",
    photo: "/hemanth-raju.jpeg",
    role: "Helper & Contributor",
    bio: "Helping Classivo grow — feedback, testing, and spreading the word across SRMIST.",
    github: "https://github.com/HemanthRaju07",
    linkedin: "https://www.linkedin.com/feed/",
    instagram: "https://www.instagram.com/k.h.raju03",
  },
];

// ─────────────────────────────────────────────────────────────────────────

export default function DevelopersPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const socials = [
    { label: "github", icon: <Github className="w-[17px] h-[17px]" style={{ color: NOVA.text }} />, href: DEVELOPER.github },
    { label: "linkedin", icon: <Linkedin className="w-[17px] h-[17px]" style={{ color: NOVA.blue }} />, href: DEVELOPER.linkedin },
    { label: "instagram", icon: <Instagram className="w-[17px] h-[17px]" style={{ color: NOVA.pink }} />, href: DEVELOPER.instagram },
  ];

  return (
    <div className="min-h-full w-full select-none" style={{ background: NOVA.bg, color: NOVA.text }}>
      {/* Top Bar */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-5 h-14 max-w-2xl mx-auto"
        style={{
          background: `${NOVA.bg}e6`,
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${NOVA.border}`,
        }}
      >
        <button
          onClick={() => { router.back(); }}
          className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-all active:scale-90"
          style={{ border: `1px solid ${NOVA.border}`, background: NOVA.panel }}
        >
          <span className="material-symbols-outlined text-[18px]" style={{ color: NOVA.lime }}>arrow_back</span>
        </button>
        <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ ...mono(), color: NOVA.muted }}>
          developers
        </span>
        <div className="w-9 h-9" />
      </header>

      {/* Scrollable content */}
      <div className="pt-14 pb-24 px-5 max-w-2xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-6 mt-5"
        >
          {/* Title */}
          <motion.div variants={itemVariants}>
            <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ ...mono(), color: NOVA.lime }}>
              developers
            </p>
            <h1 className="text-[30px] font-black tracking-tight mt-1.5" style={{ color: NOVA.text }}>
              Built With Passion<span style={{ color: NOVA.orange }}>.</span>
            </h1>
          </motion.div>
          {/* 01 · Profile */}
          <Section n="01" label="profile">
            <motion.div
              variants={itemVariants}
              className="rounded-[14px] p-6 text-center"
              style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderTop: `3px solid ${NOVA.lime}` }}
            >
              <img
                src="/developer.png"
                alt={DEVELOPER.name}
                className="w-20 h-20 rounded-[14px] object-cover mx-auto"
                style={{ border: `2px solid ${NOVA.lime}`, boxShadow: `0 0 26px ${NOVA.lime}44` }}
              />
              <h1 className="text-[22px] font-black tracking-tight mt-3" style={{ color: NOVA.text }}>
                {DEVELOPER.name}
              </h1>
              <span
                className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded inline-block mt-2"
                style={{ ...mono(), color: NOVA.orange, border: `1px solid ${NOVA.borderStrong}`, background: NOVA.bg }}
              >
                {DEVELOPER.role}
              </span>
              <p className="text-[12px] font-medium mt-3 leading-relaxed max-w-sm mx-auto" style={{ color: NOVA.muted }}>
                {DEVELOPER.bio}
              </p>

              {/* Socials */}
              <div className="flex gap-2 justify-center mt-5">
                {socials.map(({ label, icon, href }) => (
                  <a
                    key={label}
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center transition-all active:scale-90 hover:opacity-80"
                    style={{ background: NOVA.bg, border: `1px solid ${NOVA.borderStrong}` }}
                  >
                    {icon}
                  </a>
                ))}
              </div>
            </motion.div>
          </Section>

          {/* 02 · Helpers */}
          <Section n="02" label="helpers">
            <motion.div variants={itemVariants} className="flex flex-col gap-3">
              {HELPERS.map((h) => {
                const socials = [
                  { label: "github", icon: <Github className="w-[15px] h-[15px]" style={{ color: NOVA.text }} />, href: h.github },
                  { label: "linkedin", icon: <Linkedin className="w-[15px] h-[15px]" style={{ color: NOVA.blue }} />, href: h.linkedin },
                  ...(h.instagram
                    ? [{ label: "instagram", icon: <Instagram className="w-[15px] h-[15px]" style={{ color: NOVA.pink }} />, href: h.instagram }]
                    : []),
                ];

                return (
                  <div
                    key={h.name}
                    className="rounded-[14px] p-4 flex items-center gap-4"
                    style={{ background: NOVA.panel, border: `1px solid ${NOVA.border}`, borderTop: `3px solid ${NOVA.cyan}` }}
                  >
                    <img
                      src={h.photo}
                      alt={h.name}
                      className="w-16 h-16 rounded-[12px] object-cover shrink-0"
                      style={{ border: `2px solid ${NOVA.cyan}`, boxShadow: `0 0 20px ${NOVA.cyan}33` }}
                    />
                    <div className="flex-1 min-w-0">
                      <h2 className="text-[16px] font-black tracking-tight" style={{ color: NOVA.text }}>
                        {h.name}
                      </h2>
                      <span
                        className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded inline-block mt-1"
                        style={{ ...mono(), color: NOVA.cyan, border: `1px solid ${NOVA.borderStrong}`, background: NOVA.bg }}
                      >
                        {h.role}
                      </span>
                      <p className="text-[11px] font-medium mt-1.5 leading-relaxed" style={{ color: NOVA.muted }}>
                        {h.bio}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {socials.map(({ label, icon, href }) => (
                        <a
                          key={label}
                          href={href}
                          target={href.startsWith("http") ? "_blank" : undefined}
                          rel="noreferrer"
                          className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-all active:scale-90 hover:opacity-80"
                          style={{ background: NOVA.bg, border: `1px solid ${NOVA.borderStrong}` }}
                        >
                          {icon}
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </Section>

          {/* Footer */}
          <div className="pt-2 pb-6 text-center">
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ ...mono(), color: NOVA.faint }}>
              classivo // designed & developed by {DEVELOPER.name}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
