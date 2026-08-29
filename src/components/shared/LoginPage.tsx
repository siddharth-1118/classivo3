"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { EncryptionUtils } from "@/utils/shared/Encryption";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import LoadingPage from "./LoadingPage";
import { ConnectionSource } from "@/types";
import { fetchWithLoadBalancer } from "@/utils/backendProxy";

interface LoginPageProps {
  onLogin: (data: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const { performLogin } = useApp();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<ConnectionSource>("academia");

  // Shared credentials fields
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // CAPTCHA verification state
  const [captchaInput, setCaptchaInput] = useState<string>("");
  const [captchaImage, setCaptchaImage] = useState<string | null>(null);
  const [cdigest, setCdigest] = useState<string | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState<boolean>(false);

  // SRM Student Portal session state
  const [srmConnectionId, setSrmConnectionId] = useState<string | null>(null);
  const [srmInitLoading, setSrmInitLoading] = useState<boolean>(false);
  const [srmInitError, setSrmInitError] = useState<string>("");
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isExiting, setIsExiting] = useState(false);

  const formatUsername = (val: string) => {
    const cleanVal = val.trim();
    if (activeTab === "academia") {
      return cleanVal.includes("@") ? cleanVal : `${cleanVal}@srmist.edu.in`;
    }
    return cleanVal;
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

  // SRM Student Portal: Initialize session & load CAPTCHA
  const initSRMSession = useCallback(async () => {
    setSrmInitLoading(true);
    setSrmInitError("");
    setCaptchaImage(null);
    setCdigest(null);
    setSrmConnectionId(null);
    try {
      const res = await fetchWithLoadBalancer("/portal/srm/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        let msg = "Unable to connect to SRM Portal.";
        try {
          const errBody = await res.json();
          msg = errBody.detail || errBody.message || msg;
          if (typeof msg === "object" && msg !== null) {
            msg = (msg as any).message || JSON.stringify(msg);
          }
        } catch {}
        if (res.status === 503) {
          msg = "SRM Student Portal is currently unavailable. The portal may be down or restricted to campus network access. Please try again later.";
        }
        setSrmInitError(msg);
        return;
      }

      const result = await res.json();
      if (result.success && result.connectionId) {
        setSrmConnectionId(result.connectionId);
        setCaptchaImage(result.captchaImage || null);
        setCdigest(result.captchaCdigest || null);
        setError("");
      } else {
        setSrmInitError(result.message || "Unable to load the verification image. Please refresh and try again.");
      }
    } catch (err: any) {
      setSrmInitError("Unable to connect to SRM Portal. Please check your connection and try again.");
    } finally {
      setSrmInitLoading(false);
    }
  }, []);

  // SRM Student Portal: Refresh CAPTCHA challenge
  const refreshSRMCaptcha = useCallback(async () => {
    if (!srmConnectionId) return;
    setCaptchaLoading(true);
    try {
      const res = await fetchWithLoadBalancer("/portal/srm/captcha/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: srmConnectionId }),
      });
      const result = await res.json();
      if (result.success) {
        setCaptchaImage(result.captchaImage || null);
        setCdigest(result.captchaCdigest || null);
        setCaptchaInput("");
        setError("");
      } else {
        setError(result.message || "Unable to refresh CAPTCHA.");
        if (res.status === 410) {
          setSrmConnectionId(null);
          initSRMSession();
        }
      }
    } catch {
      setError("Unable to refresh CAPTCHA. Please try again.");
    } finally {
      setCaptchaLoading(false);
    }
  }, [srmConnectionId, initSRMSession]);

  // Switch connection source tabs
  const switchTab = (tab: ConnectionSource) => {
    setActiveTab(tab);
    resetState();
    if (tab === "srm_portal") {
      initSRMSession();
    }
  };

  // Auto-init SRM Portal session on selection
  useEffect(() => {
    if (activeTab === "srm_portal" && !srmConnectionId && !srmInitLoading) {
      initSRMSession();
    }
  }, [activeTab, srmConnectionId, srmInitLoading, initSRMSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError(
        activeTab === "academia"
          ? "Please fill in your NetID and academia password."
          : "Please fill in your registration number and portal password."
      );
      return;
    }

    setError("");
    const fullUsername = formatUsername(username);

    // --- Admin Override (Academia Only) ---
    if (activeTab === "academia") {
      const adminPassword = process.env.NEXT_PUBLIC_ADMIN_KEY || "srmnest-admin-2024";
      if (fullUsername === "admin@srmist.edu.in" && password === adminPassword) {
        setLoading(true);
        setTimeout(() => {
          onLogin({
            isAdmin: true,
            profile: { name: "Administrator" },
            attendance: [],
            marks: [],
            schedule: {}
          });
        }, 1000);
        return;
      }
    }
    // --------------------------------------

    setLoading(true);

    // SRM Student Portal Submission
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
        const res = await fetchWithLoadBalancer("/portal/srm/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionId: srmConnectionId,
            registrationNumber: fullUsername,
            password,
            captcha: captchaInput.trim(),
          }),
        });
        const result = await res.json();

        // FastAPI wraps HTTPException detail in { detail: ... }
        const payload = (result && typeof result === "object" && result.detail && typeof result.detail === "object")
          ? result.detail
          : result;

        if (payload.success) {
          EncryptionUtils.saveEncrypted("classivo_credentials", {
            username: fullUsername,
            password,
          });
          onLogin(payload);
          return;
        }

        // CAPTCHA required or expired
        if (payload.captcha_required || payload.type === "CAPTCHA_REQUIRED") {
          setCaptchaImage(payload.captcha_image || payload.captchaImage || null);
          setCdigest(payload.cdigest || payload.captchaCdigest || null);
          setCaptchaInput("");
          setError(typeof payload.message === "string" ? payload.message : "The CAPTCHA is incorrect or has expired. Please try again.");
          if (payload.connectionId) {
            setSrmConnectionId(payload.connectionId);
          }
          setLoading(false);
          return;
        }

        // Session expired
        if (payload.error_type === "SESSION_EXPIRED" || res.status === 410) {
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
            : "Unable to connect to the academic portal right now. Please check your credentials or try again later.";
        setError(errMsg);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || "Unable to connect to the academic portal right now. Please try again later.");
        setLoading(false);
      }
      return;
    }

    // Academia Submission
    try {
      EncryptionUtils.cleanOldKeys();
      const savedCookies = EncryptionUtils.loadDecrypted("academia_cookies");
      const creds = {
        username: fullUsername,
        password: password,
        cookies: savedCookies,
        captcha: captchaInput || undefined,
        cdigest: cdigest || undefined,
      };

      let academiaData;
      try {
        academiaData = await performLogin(creds);
      } catch (err: any) {
        if (err?.type === "CAPTCHA_REQUIRED") {
          setCaptchaImage(err.image);
          setCdigest(err.cdigest);
          setError(err.message || "Please enter the Academia CAPTCHA.");
          setCaptchaInput("");
        } else {
          setCaptchaImage(null);
          setCdigest(null);
          setError(err.message || "Unable to connect to the academic portal right now. Please check your credentials or try again later.");
        }
        setLoading(false);
        return;
      }

      onLogin(academiaData);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during sign in.");
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    },
    exit: {
      x: "-100%",
      opacity: 0,
      transition: {
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1] as any
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1] as any
      }
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };

  const isAcademia = activeTab === "academia";
  const showCaptcha = isAcademia ? !!captchaImage : !!captchaImage && !!srmConnectionId;

  return (
    <>
      <AnimatePresence>
        {loading && <LoadingPage />}
      </AnimatePresence>

      <motion.div 
        initial="hidden"
        animate={isExiting ? "exit" : "visible"}
        exit="exit"
        variants={containerVariants}
        className="min-h-screen w-full flex items-center justify-center p-5 relative overflow-y-auto font-body-lg bg-[#05060a]"
        style={{ backgroundColor: '#05060a' }}
      >
        {/* Ambient Aurora Background Decorations */}
        <div className="glow-sphere bg-cyan-500/15 w-[420px] h-[420px] top-[-120px] right-[-120px] animate-float" style={{ filter: "blur(110px)", position: "absolute", zIndex: 0, borderRadius: "50%" }}></div>
        <div className="glow-sphere bg-violet-500/15 w-[520px] h-[520px] bottom-[-160px] left-[-160px] animate-float" style={{ filter: "blur(110px)", position: "absolute", zIndex: 0, borderRadius: "50%", animationDelay: "-2s" }}></div>

        <main className="w-full max-w-[460px] relative z-10 py-10">
          {/* Branding Header */}
          <motion.div variants={itemVariants} className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center gradient-brand shadow-[0_8px_32px_rgba(34,211,238,0.4)] mb-4">
              <span className="material-symbols-outlined text-[30px] text-[#05060a] font-black">diamond</span>
            </div>
            <h1 className="font-display-lg text-[44px] font-black gradient-text-brand lowercase tracking-tighter leading-none">
              classivo
            </h1>
            <p className="font-body-sm text-[14px] text-white/40 mt-2 tracking-wide">
              your academia, one place
            </p>
          </motion.div>

          {/* Login Form Container */}
          <motion.div variants={itemVariants} className="aurora-border rounded-3xl" style={{ ["--card-bg" as any]: "#0b0f1e" }}>
            <div className="p-8 rounded-3xl" style={{ background: "rgba(11,15,30,0.85)", backdropFilter: "blur(20px)" }}>
            <form onSubmit={handleSubmit} className="space-y-5 animate-none" id="loginForm">
              
              {/* Tab Toggle */}
              <div className="flex rounded-2xl p-1 mb-6 border border-white/5 bg-white/5">
                <button
                  type="button"
                  onClick={() => switchTab("academia")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all relative ${
                    isAcademia ? "text-[#05060a] bg-cyan-400 font-extrabold shadow-[0_4px_20px_rgba(34,211,238,0.4)]" : "text-white/45 hover:text-white/70"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">school</span>
                  Academia
                </button>
                <button
                  type="button"
                  onClick={() => switchTab("srm_portal")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all relative ${
                    !isAcademia ? "text-[#05060a] bg-cyan-400 font-extrabold shadow-[0_4px_20px_rgba(34,211,238,0.4)]" : "text-white/45 hover:text-white/70"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">portal</span>
                  SRM Portal
                </button>
              </div>

              {/* Connection description */}
              <div className="rounded-2xl p-4 flex items-start gap-3 bg-white/5 border border-white/5 mb-5">
                <span className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${isAcademia ? "text-cyan-400" : "text-violet-400"}`}>
                  {isAcademia ? "verified_user" : "shield"}
                </span>
                <p className="text-[11px] font-medium leading-relaxed text-white/50">
                  {isAcademia
                    ? "Classivo uses your Academia account to retrieve attendance, marks, timetable, and course data."
                    : "Connect via the official SRM Student Portal to sync your academic information."}
                </p>
              </div>

              {/* SRM Portal: Loading state while initializing */}
              {!isAcademia && srmInitLoading && (
                <div className="rounded-2xl p-4 flex items-center gap-3 bg-cyan-500/10 border border-cyan-500/20 mb-5">
                  <Loader2 className="animate-spin text-cyan-400" size={16} />
                  <p className="text-[11px] font-medium text-white/60">
                    Connecting to SRM Portal...
                  </p>
                </div>
              )}

              {/* SRM Portal: Init error */}
              {!isAcademia && srmInitError && (
                <div className="rounded-2xl p-4 flex items-start gap-2 bg-red-500/10 border border-red-500/20 mb-5">
                  <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5 text-red-400">error</span>
                  <div className="flex-1">
                    <p className="text-[12px] font-bold leading-snug text-red-400">
                      {srmInitError}
                    </p>
                    <button
                      type="button"
                      onClick={initSRMSession}
                      className="text-[10px] font-bold mt-1 underline text-cyan-400"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {/* NetID / RegNo Input */}
              <div className="space-y-2 group">
                <label className="font-label-caps text-[12px] font-bold text-cyan-300/80 block uppercase tracking-wider">
                  {isAcademia ? "username (netid)" : "registration number"}
                </label>
                <div className="relative flex items-center">
                  <input 
                    className="w-full bg-transparent border-0 border-b border-outline-variant/40 py-2.5 pr-28 text-on-surface focus:ring-0 focus:border-cyan-400 transition-all placeholder:text-outline/40 font-body-lg text-[15px] outline-none disabled:opacity-55" 
                    placeholder={isAcademia ? "NetID" : "RA231103..."} 
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading || (!isAcademia && !srmConnectionId)}
                  />
                  {isAcademia && !username.includes("@") && (
                    <span className="absolute right-0 text-white/30 font-body-sm text-[14px] pointer-events-none pr-1 select-none">
                      @srmist.edu.in
                    </span>
                  )}
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2 group">
                <label className="font-label-caps text-[12px] font-bold text-cyan-300/80 block uppercase tracking-wider">
                  {isAcademia ? "academia password" : "portal password"}
                </label>
                <div className="relative flex items-center">
                  <input 
                    className="w-full bg-transparent border-0 border-b border-outline-variant/40 py-2.5 pr-10 text-on-surface focus:ring-0 focus:border-cyan-400 transition-all placeholder:text-outline/40 font-body-lg text-[15px] outline-none disabled:opacity-55" 
                    id="passwordField" 
                    placeholder="••••••••" 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading || (!isAcademia && !srmConnectionId)}
                  />
                  <button 
                    className="absolute right-0 text-white/40 hover:text-cyan-300 transition-colors disabled:opacity-30" 
                    onClick={() => setShowPassword(!showPassword)} 
                    type="button"
                    disabled={loading || (!isAcademia && !srmConnectionId)}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Captcha Section (only if required / loaded) */}
              <AnimatePresence>
                {showCaptcha && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <label className="font-label-caps text-[12px] font-bold text-cyan-300/80 block uppercase tracking-wider">
                        {isAcademia ? "academia verification" : "portal verification"}
                      </label>
                      {!isAcademia && (
                        <button
                          type="button"
                          onClick={refreshSRMCaptcha}
                          disabled={captchaLoading || !srmConnectionId}
                          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 active:scale-95 disabled:opacity-50"
                        >
                          {captchaLoading ? (
                            <Loader2 className="animate-spin text-cyan-400" size={12} />
                          ) : (
                            <span className="material-symbols-outlined text-[14px]">refresh</span>
                          )}
                          {captchaLoading ? "wait..." : "refresh"}
                        </button>
                      )}
                    </div>
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <input 
                          className="w-full bg-transparent border-0 border-b border-outline-variant/40 py-2.5 text-on-surface focus:ring-0 focus:border-cyan-400 transition-all placeholder:text-outline/40 font-body-lg text-[15px] outline-none" 
                          placeholder="Verification Code" 
                          type="text"
                          value={captchaInput}
                          onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                          required
                        />
                      </div>
                      <div className="w-28 h-10 rounded-lg overflow-hidden relative border border-white/10 bg-[#05060a]">
                        <img 
                          alt="captcha verification" 
                          className="w-full h-full object-contain" 
                          src={captchaImage!} 
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error messages */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1, 
                      y: 0,
                      x: [0, -6, 6, -6, 6, -3, 3, 0]
                    }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 backdrop-blur-md relative overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)",
                    }}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-red-400"></div>
                    <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
                      <span className="material-symbols-outlined text-[16px] text-red-400 font-black">gpp_maybe</span>
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-[12px] font-bold text-red-300 lowercase leading-tight block">
                        {error.toLowerCase()}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <div className="pt-2">
                <button 
                  className="w-full btn-aurora rounded-2xl py-4 flex items-center justify-center gap-2 font-black text-[13px] uppercase tracking-widest disabled:opacity-50" 
                  type="submit"
                  disabled={loading || (!isAcademia && !srmConnectionId && !srmInitLoading)}
                >
                  {loading ? "wait..." : isAcademia ? "signin" : !srmConnectionId ? "initializing..." : "connect portal"}
                  {loading ? (
                    <Loader2 className="animate-spin" size={15} />
                  ) : (
                    <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                  )}
                </button>
              </div>

              {/* Fallback Toggle Info Link */}
              <div className="pt-2 text-center">
                <p className="font-body-sm text-[12px] text-white/40 leading-relaxed">
                  {isAcademia ? (
                    <>
                      Don&apos;t have Academia access?{" "}
                      <button 
                        type="button" 
                        onClick={() => switchTab("srm_portal")} 
                        className="font-bold underline text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Connect SRM Student Portal
                      </button>
                    </>
                  ) : (
                    <>
                      Have Academia credentials?{" "}
                      <button 
                        type="button" 
                        onClick={() => switchTab("academia")} 
                        className="font-bold underline text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Use Academia Login
                      </button>
                    </>
                  )}
                </p>
              </div>

              {/* Privacy and Terms Links */}
              <div className="flex justify-center gap-4 pt-3 border-t border-white/10">
                <a className="font-label-caps text-[11px] font-bold text-white/40 hover:text-cyan-300 transition-colors uppercase tracking-wider" href="/privacy">privacy policy</a>
                <span className="text-white/20 text-[11px]">•</span>
                <a className="font-label-caps text-[11px] font-bold text-white/40 hover:text-cyan-300 transition-colors uppercase tracking-wider" href="/terms">terms &amp; conditions</a>
              </div>
            </form>
            </div>
          </motion.div>

          {/* Additional Info */}
          <p className="mt-8 text-center font-body-sm text-[13px] text-white/30 leading-relaxed">
            © 2026 srm institute of science and technology. 
            <br/>all rights reserved. internal access only.
          </p>
        </main>
      </motion.div>
    </>
  );
};

export default LoginPage;
