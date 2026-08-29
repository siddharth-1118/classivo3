"use client";

import { useEffect, useState } from "react";

export default function MaintenancePage() {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const id = setInterval(() => {
      setDots(d => (d.length >= 3 ? "." : d + "."));
    }, 600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="maintenance-root">
      {/* Animated aurora background */}
      <div className="aurora-layer" aria-hidden />

      {/* Floating orbs */}
      <div className="orb orb-1" aria-hidden />
      <div className="orb orb-2" aria-hidden />
      <div className="orb orb-3" aria-hidden />

      {/* Grid overlay */}
      <div className="grid-overlay" aria-hidden />

      {/* Main card */}
      <main className="card">
        {/* Logo / brand */}
        <div className="brand">
          <span className="brand-icon">⚡</span>
          <span className="brand-name">Classivo</span>
        </div>

        {/* Status badge */}
        <div className="status-badge">
          <span className="status-dot" />
          Under Maintenance
        </div>

        {/* Heading */}
        <h1 className="heading">
          We&rsquo;re upgrading<br />
          <span className="heading-accent">the experience</span>
        </h1>

        {/* Subtext */}
        <p className="subtext">
          Our team is working hard to bring you something even better.
          Sit tight &mdash; we&rsquo;ll be back shortly{dots}
        </p>

        {/* Progress bar */}
        <div className="progress-track" aria-label="Maintenance progress">
          <div className="progress-bar" />
        </div>

        {/* Divider */}
        <div className="divider" />

        {/* Footer note */}
        <p className="footer-note">
          Need urgent help? Reach out on{" "}
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="link"
          >
            Instagram
          </a>
        </p>
      </main>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .maintenance-root {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0d0b14;
          overflow: hidden;
          font-family: var(--font-montserrat, 'Montserrat', sans-serif);
          z-index: 9999;
        }

        /* ── Aurora ── */
        .aurora-layer {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 20% 30%, rgba(34,211,238,0.15) 0%, transparent 65%),
            radial-gradient(ellipse 60% 80% at 80% 70%, rgba(129,140,248,0.18) 0%, transparent 65%),
            radial-gradient(ellipse 50% 50% at 50% 100%, rgba(167,139,250,0.12) 0%, transparent 60%);
          animation: aurora-shift 8s ease-in-out infinite alternate;
        }
        @keyframes aurora-shift {
          0%   { opacity: 0.8; transform: scale(1) rotate(0deg); }
          100% { opacity: 1;   transform: scale(1.04) rotate(1deg); }
        }

        /* ── Orbs ── */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          animation: float 10s ease-in-out infinite alternate;
        }
        .orb-1 {
          width: 420px; height: 420px;
          background: rgba(34,211,238,0.12);
          top: -120px; left: -80px;
          animation-delay: 0s;
        }
        .orb-2 {
          width: 320px; height: 320px;
          background: rgba(167,139,250,0.14);
          bottom: -80px; right: -60px;
          animation-delay: -3s;
        }
        .orb-3 {
          width: 200px; height: 200px;
          background: rgba(52,211,153,0.1);
          bottom: 30%; left: 10%;
          animation-delay: -6s;
        }
        @keyframes float {
          0%   { transform: translate(0,   0); }
          100% { transform: translate(30px, -30px); }
        }

        /* ── Grid ── */
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
        }

        /* ── Card ── */
        .card {
          position: relative;
          z-index: 10;
          width: min(480px, calc(100vw - 40px));
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 24px;
          padding: 44px 40px 36px;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow:
            0 0 0 1px rgba(34,211,238,0.06),
            0 32px 80px rgba(0,0,0,0.5),
            0 0 60px rgba(34,211,238,0.04) inset;
          animation: card-in 0.7s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }

        /* ── Brand ── */
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 28px;
        }
        .brand-icon {
          font-size: 22px;
          filter: drop-shadow(0 0 8px rgba(34,211,238,0.7));
        }
        .brand-name {
          font-size: 17px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: linear-gradient(90deg, #22d3ee, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ── Badge ── */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(251,191,36,0.1);
          border: 1px solid rgba(251,191,36,0.25);
          border-radius: 999px;
          padding: 5px 14px;
          font-size: 12px;
          font-weight: 600;
          color: #fbbf24;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 24px;
        }
        .status-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #fbbf24;
          animation: pulse-dot 1.6s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1;   box-shadow: 0 0 0 0 rgba(251,191,36,0.5); }
          50%       { opacity: 0.6; box-shadow: 0 0 0 5px rgba(251,191,36,0); }
        }

        /* ── Heading ── */
        .heading {
          font-size: clamp(26px, 6vw, 32px);
          font-weight: 800;
          line-height: 1.2;
          color: #f4f4f8;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
        }
        .heading-accent {
          background: linear-gradient(90deg, #22d3ee 0%, #a78bfa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ── Subtext ── */
        .subtext {
          font-size: 14.5px;
          line-height: 1.7;
          color: rgba(200,200,220,0.65);
          margin-bottom: 28px;
          font-weight: 400;
        }

        /* ── Progress ── */
        .progress-track {
          height: 3px;
          background: rgba(255,255,255,0.07);
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 28px;
        }
        .progress-bar {
          height: 100%;
          width: 60%;
          border-radius: 999px;
          background: linear-gradient(90deg, #22d3ee, #818cf8, #a78bfa);
          background-size: 200% 100%;
          animation: shimmer 2.4s linear infinite;
        }
        @keyframes shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }

        /* ── Divider ── */
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          margin-bottom: 20px;
        }

        /* ── Footer ── */
        .footer-note {
          font-size: 13px;
          color: rgba(180,180,200,0.45);
          text-align: center;
        }
        .link {
          color: #22d3ee;
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.2s;
        }
        .link:hover { opacity: 0.75; }
      `}</style>
    </div>
  );
}
