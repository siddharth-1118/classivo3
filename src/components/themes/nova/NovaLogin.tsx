"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { EncryptionUtils } from "@/utils/shared/Encryption";
import { ConnectionSource } from "@/types";
import { fetchWithLoadBalancer } from "@/utils/backendProxy";

const BEZIER = [0.34, 0.15, 0.16, 0.96] as const;

const mono: React.CSSProperties = {
  fontFamily: "'Geist Mono', 'JetBrains Mono', 'Fira Code', monospace",
};

export default function NovaLogin({ onLogin }: { onLogin: (data: any) => void }) {
  const { performLogin, setAcademicYearLevel, setYearDetection, setConnectionSource } = useApp();
  const [activeTab, setActiveTab] = useState<ConnectionSource>("academia");

  // Post-login year-aware prompt state
  const [showYearPrompt, setShowYearPrompt] = useState(false);
  const [yearPromptData, setYearPromptData] = useState<any>(null);
  const [portalConnecting, setPortalConnecting] = useState(false);
  const [portalConnectError, setPortalConnectError] = useState("");
  const [portalConnectionId, setPortalConnectionId] = useState<string | null>(null);
  const [portalCaptchaImage, setPortalCaptchaImage] = useState<string | null>(null);
  const [portalCaptchaInput, setPortalCaptchaInput] = useState("");
  const [portalRegNo, setPortalRegNo] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [portalShowPw, setPortalShowPw] = useState(false);
  const [portalInitLoading, setPortalInitLoading] = useState(false);
  const [portalCaptchaLoading, setPortalCaptchaLoading] = useState(false);

  // Shared fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // CAPTCHA state
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaImage, setCaptchaImage] = useState<string | null>(null);
  const [cdigest, setCdigest] = useState<string | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);

  // SRM Portal state
  const [srmConnectionId, setSrmConnectionId] = useState<string | null>(null);
  const [srmInitLoading, setSrmInitLoading] = useState(false);
  const [srmInitError, setSrmInitError] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatUsername = (val: string) => {
    const clean = val.trim();
    if (activeTab === "academia") {
      return clean.includes("@") ? clean : `${clean}@srmist.edu.in`;
    }
    return clean;
  };

  const resetState = () => {
    setUsername("");
    setPassword("");
    setCaptchaInput("");
    setCaptchaImage(null);
    setCdigest(null);
    setCaptchaLoading(false);
    setSrmConnectionId(null);
    setSrmInitLoading(false);
    setSrmInitError("");
    setError("");
  };

  // ── SRM Portal: Initialize session + get CAPTCHA ─────────────────────
  const initSRMSession = useCallback(async () => {
    setSrmInitLoading(true);
    setSrmInitError("");
    setCaptchaImage(null);
    setCdigest(null);
    setSrmConnectionId(null);
    try {
      const data = await fetchWithLoadBalancer("/portal/srm/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!data.ok) {
        let msg = "Unable to connect to SRM Portal.";
        try {
          const errBody = await data.json();
          const rawDetail = errBody.detail || errBody.message || msg;
          if (typeof rawDetail === "object" && rawDetail !== null) {
            msg = rawDetail.message || JSON.stringify(rawDetail);
          } else {
            msg = String(rawDetail);
          }
        } catch {}
        if (data.status === 503) {
          msg = "SRM Student Portal is currently unreachable. Please try again later.";
        }
        setSrmInitError(msg);
        setLoading(false);
        return;
      }
      const result = await data.json();
      if (result.success && result.connectionId) {
        setSrmConnectionId(result.connectionId);
        setCaptchaImage(result.captchaImage || null);
        setCdigest(result.captchaCdigest || null);
        setError("");
      } else {
        setSrmInitError(result.message || "Unable to load the verification image.");
      }
    } catch {
      setSrmInitError("Unable to connect to SRM Portal.");
    } finally {
      setSrmInitLoading(false);
    }
  }, []);

  // ── SRM Portal: Refresh CAPTCHA ──────────────────────────────────────
  const refreshSRMCaptcha = useCallback(async () => {
    if (!srmConnectionId) return;
    setCaptchaLoading(true);
    try {
      const data = await fetchWithLoadBalancer("/portal/srm/captcha/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: srmConnectionId }),
      });
      const result = await data.json();
      if (result.success) {
        setCaptchaImage(result.captchaImage || null);
        setCdigest(result.captchaCdigest || null);
        setCaptchaInput("");
        setError("");
      } else {
        setError(result.message || "Unable to refresh CAPTCHA.");
        if (data.status === 410) {
          setSrmConnectionId(null);
          initSRMSession();
        }
      }
    } catch {
      setError("Unable to refresh CAPTCHA.");
    } finally {
      setCaptchaLoading(false);
    }
  }, [srmConnectionId, initSRMSession]);

  // ── Tab switch ───────────────────────────────────────────────────────
  const switchTab = (tab: ConnectionSource) => {
    setActiveTab(tab);
    resetState();
    if (tab === "srm_portal") {
      initSRMSession();
    }
  };

  useEffect(() => {
    if (activeTab === "srm_portal" && !srmConnectionId && !srmInitLoading) {
      initSRMSession();
    }
  }, [activeTab, srmConnectionId, srmInitLoading, initSRMSession]);

  // ── Secondary SRM Portal connection (for 2nd-year+ after Academia login) ──
  const initPortalSession = useCallback(async () => {
    setPortalInitLoading(true);
    setPortalConnectError("");
    setPortalCaptchaImage(null);
    setPortalConnectionId(null);
    try {
      const data = await fetchWithLoadBalancer("/portal/srm/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!data.ok) {
        let msg = "Unable to connect to SRM Portal.";
        try {
          const errBody = await data.json();
          const rawDetail = errBody.detail || errBody.message || msg;
          if (typeof rawDetail === "object" && rawDetail !== null) {
            msg = rawDetail.message || JSON.stringify(rawDetail);
          } else {
            msg = String(rawDetail);
          }
        } catch {}
        if (data.status === 503) {
          msg = "SRM Student Portal is currently unreachable. Please try again later.";
        }
        setPortalConnectError(msg);
        setPortalInitLoading(false);
        return;
      }
      const result = await data.json();
      if (result.success && result.connectionId) {
        setPortalConnectionId(result.connectionId);
        setPortalCaptchaImage(result.captchaImage || null);
        setPortalConnectError("");
      } else {
        setPortalConnectError(result.message || "Unable to load the verification image.");
      }
    } catch {
      setPortalConnectError("Unable to connect to SRM Portal.");
    } finally {
      setPortalInitLoading(false);
    }
  }, []);

  const refreshPortalCaptcha = useCallback(async () => {
    if (!portalConnectionId) return;
    setPortalCaptchaLoading(true);
    try {
      const data = await fetchWithLoadBalancer("/portal/srm/captcha/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: portalConnectionId }),
      });
      const result = await data.json();
      if (result.success) {
        setPortalCaptchaImage(result.captchaImage || null);
        setPortalCaptchaInput("");
        setPortalConnectError("");
      } else {
        setPortalConnectError(result.message || "Unable to refresh CAPTCHA.");
        if (data.status === 410) {
          setPortalConnectionId(null);
          initPortalSession();
        }
      }
    } catch {
      setPortalConnectError("Unable to refresh CAPTCHA.");
    } finally {
      setPortalCaptchaLoading(false);
    }
  }, [portalConnectionId, initPortalSession]);

  const handlePortalConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalRegNo || !portalPassword) {
      setPortalConnectError("Please enter your registration number and password.");
      return;
    }
    if (!portalCaptchaInput.trim()) {
      setPortalConnectError("Please enter the CAPTCHA value.");
      return;
    }
    if (!portalConnectionId) {
      setPortalConnectError("Session not ready. Please wait for CAPTCHA to load.");
      return;
    }
    setPortalConnecting(true);
    setPortalConnectError("");
    try {
      const data = await fetchWithLoadBalancer("/portal/srm/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId: portalConnectionId,
          registrationNumber: portalRegNo.trim(),
          password: portalPassword,
          captcha: portalCaptchaInput.trim(),
        }),
      });
      const result = await data.json();
      const payload = (result && typeof result === "object" && result.detail && typeof result.detail === "object")
        ? result.detail : result;

      if (payload.success) {
        EncryptionUtils.saveEncrypted("classivo_credentials", { username: portalRegNo.trim(), password: portalPassword });
        setConnectionSource("academia");
        localStorage.setItem("classivo_connection_source", "academia");
        const srmSchedule = payload.schedule || {};
        const academiaSchedule = yearPromptData?.schedule || {};
        const hasSRMTimetable = srmSchedule && typeof srmSchedule === "object" && Object.keys(srmSchedule).length > 0;
        const mergedData = {
          ...yearPromptData,
          attendance: payload.attendance || yearPromptData?.attendance || [],
          marks: payload.marks || yearPromptData?.marks || [],
          academicCalendar: payload.academicCalendar || yearPromptData?.academicCalendar || [],
          timetable: hasSRMTimetable ? (payload.timetable || srmSchedule) : (yearPromptData?.timetable || academiaSchedule),
          schedule: hasSRMTimetable ? srmSchedule : academiaSchedule,
          portalConnected: true,
          source: "academia",
        };
        onLogin(mergedData);
        return;
      }

      if (payload.captcha_required || payload.type === "CAPTCHA_REQUIRED") {
        setPortalCaptchaImage(payload.captcha_image || payload.captchaImage || null);
        setPortalCaptchaInput("");
        setPortalConnectError(typeof payload.message === "string" ? payload.message : "The CAPTCHA is incorrect or expired.");
        if (payload.connectionId) setPortalConnectionId(payload.connectionId);
        setPortalConnecting(false);
        return;
      }

      if (payload.error_type === "SESSION_EXPIRED" || data.status === 410) {
        setPortalConnectionId(null);
        setPortalConnectError("Session expired. Reconnecting...");
        initPortalSession();
        setPortalConnecting(false);
        return;
      }

      const errMsg = typeof payload.message === "string"
        ? payload.message
        : typeof payload.detail === "string"
          ? payload.detail
          : "Login failed. Please try again.";
      setPortalConnectError(errMsg);
    } catch (err: any) {
      setPortalConnectError(err?.message || "Connection failed.");
    } finally {
      setPortalConnecting(false);
    }
  };

  const skipPortalConnection = () => {
    setShowYearPrompt(false);
    if (yearPromptData) {
      onLogin(yearPromptData);
    }
  };

  useEffect(() => {
    if (showYearPrompt && !portalConnectionId && !portalInitLoading) {
      initPortalSession();
    }
  }, [showYearPrompt, portalConnectionId, portalInitLoading, initPortalSession]);

  // ── Form submit ──────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError(
        activeTab === "academia"
          ? "Please enter your email and academia password."
          : "Please enter your registration number and portal password."
      );
      return;
    }
    setError("");
    const fullUsername = formatUsername(username);

    if (activeTab === "academia") {
      const adminPassword = process.env.NEXT_PUBLIC_ADMIN_KEY || "srmnest-admin-2024";
      if (fullUsername === "admin@srmist.edu.in" && password === adminPassword) {
        setLoading(true);
        setTimeout(() => {
          onLogin({ isAdmin: true, profile: { name: "Administrator" }, attendance: [], marks: [], schedule: {} });
        }, 700);
        return;
      }
    }

    setLoading(true);

    if (activeTab === "srm_portal") {
      if (!srmConnectionId) {
        setError("Session not ready. Please wait for the CAPTCHA to load.");
        setLoading(false);
        return;
      }
      if (!captchaInput.trim()) {
        setError("Please enter the CAPTCHA value.");
        setLoading(false);
        return;
      }
      try {
        const data = await fetchWithLoadBalancer("/portal/srm/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionId: srmConnectionId,
            registrationNumber: fullUsername,
            password,
            captcha: captchaInput.trim(),
          }),
        });
        const result = await data.json();
        const payload = (result && typeof result === "object" && result.detail && typeof result.detail === "object")
          ? result.detail : result;

        if (payload.success) {
          EncryptionUtils.saveEncrypted("classivo_credentials", { username: fullUsername, password });
          if (payload.academicYearLevel) {
            setAcademicYearLevel(payload.academicYearLevel);
            localStorage.setItem("classivo_academic_year", String(payload.academicYearLevel));
          }
          if (payload.yearDetection) {
            setYearDetection(payload.yearDetection);
            localStorage.setItem("classivo_year_detection", JSON.stringify(payload.yearDetection));
          }
          setConnectionSource("srm_portal");
          localStorage.setItem("classivo_connection_source", "srm_portal");
          onLogin(payload);
          return;
        }

        if (payload.captcha_required || payload.type === "CAPTCHA_REQUIRED") {
          setCaptchaImage(payload.captcha_image || payload.captchaImage || null);
          setCdigest(payload.cdigest || payload.captchaCdigest || null);
          setCaptchaInput("");
          setError(typeof payload.message === "string" ? payload.message : "The CAPTCHA is incorrect or has expired. Please try again.");
          if (payload.connectionId) setSrmConnectionId(payload.connectionId);
          setLoading(false);
          return;
        }

        if (payload.error_type === "SESSION_EXPIRED" || data.status === 410) {
          setSrmConnectionId(null);
          setError("Session expired. Reconnecting...");
          initSRMSession();
          setLoading(false);
          return;
        }

        const errMsg = typeof payload.message === "string"
          ? payload.message
          : typeof payload.detail === "string"
            ? payload.detail
            : "Login failed. Please try again.";
        setError(errMsg);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || "Connection failed. Please try again.");
        setLoading(false);
      }
      return;
    }

    // Academia login
    try {
      EncryptionUtils.cleanOldKeys();
      const savedCookies = EncryptionUtils.loadDecrypted("academia_cookies");
      const creds: any = { username: fullUsername, password };
      if (captchaInput && cdigest) {
        creds.captcha = captchaInput;
        creds.cdigest = cdigest;
      }
      if (activeTab === "academia") {
        creds.cookies = savedCookies;
      }

      try {
        const data = await performLogin(creds, activeTab);
        let yearLevel = data?.academicYearLevel;
        if (!yearLevel && data?.profile?.semester) {
          const sem = parseInt(String(data.profile.semester), 10);
          if (sem >= 3) yearLevel = Math.ceil(sem / 2);
          else yearLevel = 1;
        }
        yearLevel = yearLevel || 1;
        setAcademicYearLevel(yearLevel);
        localStorage.setItem("classivo_academic_year", String(yearLevel));
        if (data?.yearDetection) {
          setYearDetection(data.yearDetection);
          localStorage.setItem("classivo_year_detection", JSON.stringify(data.yearDetection));
        }
        if (yearLevel >= 2) {
          setYearPromptData(data);
          setShowYearPrompt(true);
          setLoading(false);
          return;
        }
        onLogin(data);
      } catch (err: any) {
        if (err?.type === "CAPTCHA_REQUIRED" || err?.captcha_required) {
          setCaptchaImage(err.image || err.captcha_image);
          setCdigest(err.cdigest || err.cd);
          setError(err.message || "Please complete the verification.");
          setCaptchaInput("");
        } else {
          if (!captchaImage) { setCaptchaImage(null); setCdigest(null); }
          setError(err.message || "Authentication failed.");
        }
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "Unexpected error.");
      setLoading(false);
    }
  };

  const isAcademia = activeTab === "academia";
  const showCaptcha = isAcademia ? !!captchaImage : !!captchaImage && !!srmConnectionId;

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: "#06060a" }}>
      {/* ── Background gradient orbs ─────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top-left green orb */}
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full opacity-40 blur-[120px]"
          style={{ background: "radial-gradient(circle, #84cc16 0%, #4d7c0f 40%, transparent 70%)" }} />
        {/* Right blue orb */}
        <div className="absolute top-1/4 -right-20 w-[350px] h-[350px] rounded-full opacity-35 blur-[100px]"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, #1d4ed8 40%, transparent 70%)" }} />
        {/* Bottom-right purple orb */}
        <div className="absolute -bottom-40 -right-20 w-[400px] h-[400px] rounded-full opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(circle, #a855f7 0%, #7c3aed 40%, transparent 70%)" }} />
        {/* Bottom-left subtle green */}
        <div className="absolute -bottom-20 -left-20 w-[250px] h-[250px] rounded-full opacity-20 blur-[80px]"
          style={{ background: "radial-gradient(circle, #65a30d 0%, transparent 70%)" }} />
        {/* Dot grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>

      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[400px] mx-5 py-8">
        <div className="rounded-[28px] overflow-hidden relative"
          style={{
            background: "rgba(12, 14, 20, 0.85)",
            backdropFilter: "blur(40px)",
            border: "1px solid transparent",
            backgroundImage: "linear-gradient(rgba(12, 14, 20, 0.9), rgba(12, 14, 20, 0.9)), linear-gradient(135deg, #84cc16 0%, #06b6d4 35%, #3b82f6 65%, #a855f7 100%)",
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
          }}>

          {/* ── Brand ────────────────────────────────────────────────── */}
          <div className="pt-10 pb-2 px-8 text-center">
            {/* Logo */}
            <div className="flex justify-center mb-5">
              <div className="relative">
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                  {/* Outer diamond */}
                  <path d="M28 4L52 28L28 52L4 28L28 4Z" stroke="url(#logoGrad)" strokeWidth="2.5" fill="none" />
                  {/* Inner diamond */}
                  <path d="M28 14L42 28L28 42L14 28L28 14Z" fill="url(#logoGrad)" opacity="0.2" />
                  {/* C shape */}
                  <path d="M36 24C33.5 21 31 20 28 20C23.5 20 20 23.5 20 28C20 32.5 23.5 36 28 36" stroke="url(#logoGrad)" strokeWidth="3" strokeLinecap="round" fill="none" />
                  <defs>
                    <linearGradient id="logoGrad" x1="4" y1="4" x2="52" y2="52">
                      <stop stopColor="#84cc16" />
                      <stop offset="1" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Wordmark */}
            <p className="text-[22px] font-bold tracking-tight text-white">
              Classivo<span className="text-[#84cc16]">.</span>
            </p>

            {/* Heading */}
            <h1 className="text-[42px] font-black tracking-tight text-white mt-1 leading-none">
              Connect<span className="text-[#84cc16]">.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-[15px] mt-2" style={{ color: "#9ca3af" }}>
              Link your academic account.
            </p>
          </div>

          {/* ── Tab Switcher ──────────────────────────────────────────── */}
          <div className="px-8 mt-6">
            <div className="flex rounded-full p-1" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {([
                { key: "academia" as ConnectionSource, label: "Academia" },
                { key: "srm_portal" as ConnectionSource, label: "SRM Portal" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => switchTab(key)}
                  className="flex-1 py-2.5 rounded-full text-[13px] font-bold transition-all duration-300"
                  style={{
                    ...mono,
                    background: activeTab === key ? "linear-gradient(135deg, #84cc16 0%, #06b6d4 100%)" : "transparent",
                    color: activeTab === key ? "#06060a" : "#6b7280",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Form ──────────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.form
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: BEZIER }}
              onSubmit={handleSubmit}
              className="px-8 pt-5 pb-8 space-y-4"
            >
              {/* Info box */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl"
                style={{ background: "rgba(132, 204, 22, 0.06)", border: "1px solid rgba(132, 204, 22, 0.12)" }}>
                <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                  style={{ background: "rgba(132, 204, 22, 0.15)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-[12px] leading-relaxed" style={{ color: "#d1d5db", ...mono }}>
                  {isAcademia
                    ? "We use secure OAuth to access your Academia account. Your data is private and never shared."
                    : "Connect via the official SRM Student Portal to sync your academic information."}
                </p>
              </div>

              {/* Email / Registration Number */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ ...mono, color: "#84cc16" }}>
                  {isAcademia ? "Email" : "Registration Number"}
                </label>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <input
                    type={isAcademia ? "email" : "text"}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={isAcademia ? "student@example.com" : "RA2311030017"}
                    disabled={loading}
                    className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-gray-600"
                    style={{ color: "#f4f4f4", ...mono }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ ...mono, color: "#84cc16" }}>
                  {isAcademia ? "Academia Password" : "Portal Password"}
                </label>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-gray-600"
                    style={{ color: "#f4f4f4", ...mono }}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="shrink-0 p-1">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
                      {showPw ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* SRM Portal: Loading */}
              {!isAcademia && srmInitLoading && (
                <div className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(6, 182, 212, 0.06)", border: "1px solid rgba(6, 182, 212, 0.12)" }}>
                  <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-[12px]" style={{ color: "#67e8f9", ...mono }}>Connecting to SRM Portal...</p>
                </div>
              )}

              {/* SRM Portal: Init error */}
              {!isAcademia && srmInitError && (
                <div className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.12)" }}>
                  <span className="text-[12px] mt-0.5" style={{ color: "#f87171" }}>!</span>
                  <div className="flex-1">
                    <p className="text-[12px] leading-snug" style={{ color: "#fca5a5", ...mono }}>{srmInitError}</p>
                    <button type="button" onClick={initSRMSession} className="text-[11px] font-bold mt-1 underline" style={{ color: "#67e8f9", ...mono }}>
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {/* CAPTCHA */}
              {showCaptcha && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ ...mono, color: "#84cc16" }}>
                    CAPTCHA <span className="normal-case font-normal opacity-50">(if shown)</span>
                  </label>
                  <div className="flex gap-3">
                    <div className="shrink-0 w-[130px] h-[44px] rounded-xl flex items-center justify-center overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      {captchaImage ? (
                        <img src={captchaImage} alt="CAPTCHA" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[11px]" style={{ color: "#6b7280", ...mono }}>Loading...</span>
                      )}
                    </div>
                    <div className="flex-1 flex items-center gap-2 px-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <input
                        value={captchaInput}
                        onChange={(e) => setCaptchaInput(e.target.value)}
                        placeholder="Enter text"
                        className="flex-1 bg-transparent text-[13px] font-medium outline-none placeholder:text-gray-600 tracking-wider"
                        style={{ color: "#f4f4f4", ...mono }}
                      />
                      <button type="button" onClick={isAcademia ? undefined : refreshSRMCaptcha}
                        disabled={captchaLoading || (!isAcademia && !srmConnectionId)}
                        className="shrink-0 p-1 rounded-lg transition-all active:scale-95 disabled:opacity-40"
                        style={{ color: "#84cc16" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                          className={captchaLoading ? "animate-spin" : ""}>
                          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.12)" }}>
                  <span className="text-[12px]" style={{ color: "#f87171" }}>!</span>
                  <p className="text-[12px] leading-snug" style={{ color: "#fca5a5", ...mono }}>
                    {typeof error === "string" ? error : "An unexpected error occurred."}
                  </p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || (!isAcademia && !srmConnectionId && !srmInitLoading)}
                className="w-full py-4 rounded-xl text-[14px] font-black uppercase tracking-[0.12em] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                style={{
                  ...mono,
                  background: "linear-gradient(135deg, #84cc16 0%, #06b6d4 100%)",
                  color: "#06060a",
                  boxShadow: "0 4px 30px rgba(132, 204, 22, 0.2), 0 0 60px rgba(6, 182, 212, 0.1)",
                }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-[2.5px] border-black border-t-transparent rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    {isAcademia ? "Connect Academia" : "Connect Student Portal"}
                    <span className="text-[16px]">→</span>
                  </>
                )}
              </button>
            </motion.form>
          </AnimatePresence>

          {/* ── Switch connection type ────────────────────────────────── */}
          <div className="px-8 pb-2">
            <button
              type="button"
              onClick={() => switchTab(isAcademia ? "srm_portal" : "academia")}
              className="w-full text-center py-2"
            >
              <span className="text-[12px]" style={{ color: "#6b7280", ...mono }}>
                Don&apos;t have {isAcademia ? "Academia" : "SRM Portal"}?{" "}
              </span>
              <span className="text-[12px] font-bold underline" style={{ color: "#84cc16", ...mono }}>
                {isAcademia ? "Connect SRM Student Portal" : "Use Academia Login"}
              </span>
            </button>
          </div>
        </div>

        {/* ── Footer links ──────────────────────────────────────────────── */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <a href="/privacy" className="text-[12px] hover:underline" style={{ color: "#6b7280", ...mono }}>privacy</a>
            <span className="text-[10px]" style={{ color: "#3b82f6" }}>•</span>
            <a href="/terms" className="text-[12px] hover:underline" style={{ color: "#6b7280", ...mono }}>terms</a>
          </div>
        </div>
      </div>

      {/* ── Year-Aware Portal Connection Modal ─────────────────────── */}
      <AnimatePresence>
        {showYearPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-5"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-[420px] rounded-[24px] overflow-hidden"
              style={{
                background: "rgba(12, 14, 20, 0.95)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(40px)",
              }}
            >
              {/* Modal Header */}
              <div className="p-6 pb-3">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(59, 130, 246, 0.12)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
                      <path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" />
                      <path d="M9 9v.01" /><path d="M9 12v.01" /><path d="M9 15v.01" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white">Connect SRM Student Portal</h3>
                    <p className="text-[11px] mt-0.5" style={{ color: "#6b7280", ...mono }}>To view attendance & marks</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(59, 130, 246, 0.06)", border: "1px solid rgba(59, 130, 246, 0.12)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" className="shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <p className="text-[11px] leading-relaxed" style={{ color: "#93c5fd", ...mono }}>
                    You&apos;re logged in via Academia. Connect your SRM Student Portal to also view attendance and marks.
                  </p>
                </div>
              </div>

              <form onSubmit={handlePortalConnect} className="px-6 pb-6 space-y-4">
                {/* Registration Number */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ ...mono, color: "#84cc16" }}>
                    Registration Number
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <input type="text" value={portalRegNo} onChange={(e) => setPortalRegNo(e.target.value)}
                      placeholder="RA2311030017" disabled={portalConnecting}
                      className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-gray-600"
                      style={{ color: "#f4f4f4", ...mono }} />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ ...mono, color: "#84cc16" }}>
                    Portal Password
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <input type={portalShowPw ? "text" : "password"} value={portalPassword}
                      onChange={(e) => setPortalPassword(e.target.value)} placeholder="••••••••" disabled={portalConnecting}
                      className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-gray-600"
                      style={{ color: "#f4f4f4", ...mono }} />
                    <button type="button" onClick={() => setPortalShowPw(!portalShowPw)} className="shrink-0 p-1">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
                        {portalShowPw ? (
                          <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
                        ) : (
                          <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Loading */}
                {portalInitLoading && (
                  <div className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "rgba(6, 182, 212, 0.06)", border: "1px solid rgba(6, 182, 212, 0.12)" }}>
                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[12px]" style={{ color: "#67e8f9", ...mono }}>Connecting to SRM Portal...</p>
                  </div>
                )}

                {/* Init error */}
                {!portalInitLoading && portalConnectError && !portalConnectionId && (
                  <div className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.12)" }}>
                    <span className="text-[12px] mt-0.5" style={{ color: "#f87171" }}>!</span>
                    <div className="flex-1">
                      <p className="text-[12px] leading-snug" style={{ color: "#fca5a5", ...mono }}>{portalConnectError}</p>
                      <button type="button" onClick={initPortalSession} className="text-[11px] font-bold mt-1 underline" style={{ color: "#67e8f9", ...mono }}>
                        Try again
                      </button>
                    </div>
                  </div>
                )}

                {/* CAPTCHA */}
                {portalConnectionId && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ ...mono, color: "#84cc16" }}>
                      CAPTCHA
                    </label>
                    <div className="flex gap-3">
                      <div className="shrink-0 w-[130px] h-[44px] rounded-xl flex items-center justify-center overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {portalCaptchaImage ? (
                          <img src={portalCaptchaImage} alt="CAPTCHA" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[11px]" style={{ color: "#6b7280", ...mono }}>Loading...</span>
                        )}
                      </div>
                      <div className="flex-1 flex items-center gap-2 px-3 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <input value={portalCaptchaInput} onChange={(e) => setPortalCaptchaInput(e.target.value)}
                          placeholder="Enter text" className="flex-1 bg-transparent text-[13px] font-medium outline-none placeholder:text-gray-600 tracking-wider"
                          style={{ color: "#f4f4f4", ...mono }} />
                        <button type="button" onClick={refreshPortalCaptcha} disabled={portalCaptchaLoading || !portalConnectionId}
                          className="shrink-0 p-1 rounded-lg transition-all active:scale-95 disabled:opacity-40" style={{ color: "#84cc16" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                            className={portalCaptchaLoading ? "animate-spin" : ""}>
                            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {portalConnectError && portalConnectionId && (
                  <div className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.12)" }}>
                    <span className="text-[12px]" style={{ color: "#f87171" }}>!</span>
                    <p className="text-[12px] leading-snug" style={{ color: "#fca5a5", ...mono }}>{portalConnectError}</p>
                  </div>
                )}

                {/* Connect button */}
                <button type="submit" disabled={portalConnecting || !portalConnectionId || portalInitLoading}
                  className="w-full py-4 rounded-xl text-[14px] font-black uppercase tracking-[0.12em] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    ...mono,
                    background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
                    color: "#fff",
                    boxShadow: "0 4px 30px rgba(59, 130, 246, 0.2)",
                  }}>
                  {portalConnecting ? (
                    <><div className="w-4 h-4 border-[2.5px] border-white border-t-transparent rounded-full animate-spin" /> Connecting...</>
                  ) : (
                    <>Connect Student Portal <span className="text-[16px]">→</span></>
                  )}
                </button>

                <button type="button" onClick={skipPortalConnection}
                  className="w-full py-2 rounded-xl text-[12px] font-bold" style={{ color: "#6b7280", ...mono }}>
                  Skip for now
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
