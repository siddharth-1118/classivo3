"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  LogIn,
  Moon,
  Sun,
  User,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
  Building2,
  ArrowRight,
} from "lucide-react";
import { useTheme } from "@/lib/hooks/use-theme";

type LoginTab = "academia" | "srm_portal";

async function fetchJson(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json;
}

export default function LoginPage() {
  const router = useRouter();
  const { toggleTheme, isDark } = useTheme();

  // Tab state
  const [activeTab, setActiveTab] = React.useState<LoginTab>("academia");

  // Academia form
  const [acadEmail, setAcadEmail] = React.useState("");
  const [acadPassword, setAcadPassword] = React.useState("");
  const [showAcadPassword, setShowAcadPassword] = React.useState(false);

  // SRM Portal form
  const [srmNetId, setSrmNetId] = React.useState("");
  const [srmPassword, setSrmPassword] = React.useState("");
  const [showSrmPassword, setShowSrmPassword] = React.useState(false);
  const [captcha, setCaptcha] = React.useState("");
  const [requestId, setRequestId] = React.useState("");
  const [captchaUrl, setCaptchaUrl] = React.useState("");
  const [captchaLoading, setCaptchaLoading] = React.useState(false);

  // Shared
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch SRM CAPTCHA
  const fetchCaptcha = React.useCallback(async () => {
    setCaptchaLoading(true);
    setError(null);
    try {
      const resp = await fetchJson("/api/portal/captcha");
      const data = resp.data || resp;
      setRequestId(data.requestId);
      setCaptchaUrl(data.captchaUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load captcha");
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  const handleRefreshCaptcha = React.useCallback(async () => {
    if (!requestId) {
      fetchCaptcha();
      return;
    }
    setCaptchaLoading(true);
    setError(null);
    setCaptcha("");
    try {
      const resp = await fetchJson("/api/portal/refresh-captcha", {
        method: "POST",
        body: JSON.stringify({ requestId }),
      });
      const data = resp.data || resp;
      setRequestId(data.requestId);
      setCaptchaUrl(data.captchaUrl);
    } catch {
      fetchCaptcha();
    } finally {
      setCaptchaLoading(false);
    }
  }, [requestId, fetchCaptcha]);

  // Load captcha when switching to SRM tab
  React.useEffect(() => {
    if (activeTab === "srm_portal" && !captchaUrl) {
      fetchCaptcha();
    }
  }, [activeTab, captchaUrl, fetchCaptcha]);

  // Check if already logged in
  React.useEffect(() => {
    try {
      const userStr = localStorage.getItem("srm_app_user");
      if (userStr) router.replace("/dashboard");
    } catch {}
  }, [router]);

  // Academia Login
  const handleAcademiaLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acadEmail.trim() || !acadPassword) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const result = await fetchJson("/api/academia/login", {
        method: "POST",
        body: JSON.stringify({
          email: acadEmail.trim(),
          password: acadPassword,
        }),
      });

      localStorage.setItem(
        "srm_app_user",
        JSON.stringify({
          ...result.user,
          source: "academia",
        })
      );
      localStorage.setItem("connection_source", "academia");
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Academia login failed");
    } finally {
      setLoading(false);
    }
  };

  // SRM Portal Login
  const handleSrmLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!srmNetId.trim() || !srmPassword || !captcha.trim() || !requestId) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const result = await fetchJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: srmNetId.trim(),
          password: srmPassword,
          captcha: captcha.trim(),
          requestId,
        }),
      });

      localStorage.setItem(
        "srm_app_user",
        JSON.stringify({
          ...result.user,
          source: "srm_portal",
        })
      );
      localStorage.setItem("connection_source", "srm_portal");
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setCaptcha("");
      handleRefreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (tab: LoginTab) => {
    setActiveTab(tab);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#06060a] text-white transition-colors duration-200 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[10%] right-[-5%] w-[400px] h-[400px] bg-blue-500/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[30%] w-[600px] h-[400px] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed bottom-6 right-6 z-50 h-10 w-10 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/10 transition-all"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      {/* Main content */}
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-cyan-500 flex items-center justify-center mb-4 shadow-lg shadow-green-500/20">
            <svg
              viewBox="0 0 24 24"
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            class<span className="text-green-400">ivo</span>.
          </h1>
          <p className="text-white/40 text-sm mt-1 font-mono">
            Your Academic Companion
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden shadow-2xl">
          {/* Tab Switcher */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => switchTab("academia")}
              className={`flex-1 py-3.5 text-sm font-medium flex items-center justify-center gap-2 transition-all relative ${
                activeTab === "academia"
                  ? "text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              Academia
              {activeTab === "academia" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-400 to-cyan-400" />
              )}
            </button>
            <button
              onClick={() => switchTab("srm_portal")}
              className={`flex-1 py-3.5 text-sm font-medium flex items-center justify-center gap-2 transition-all relative ${
                activeTab === "srm_portal"
                  ? "text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <Building2 className="h-4 w-4" />
              SRM Student Portal
              {activeTab === "srm_portal" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-400 to-cyan-400" />
              )}
            </button>
          </div>

          {/* Info Box */}
          <div className="mx-4 mt-4 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
            <p className="text-xs text-green-400/80 font-mono leading-relaxed">
              {activeTab === "academia" ? (
                <>
                  <Shield className="inline h-3 w-3 mr-1" />
                  Connect your SRM Academia account to sync timetable and
                  academic schedule data.
                </>
              ) : (
                <>
                  <Shield className="inline h-3 w-3 mr-1" />
                  Connect your SRM Student Portal to sync attendance, marks, and
                  academic calendar.
                </>
              )}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Academia Form */}
          {activeTab === "academia" && (
            <form onSubmit={handleAcademiaLogin} className="p-4 space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-green-400/70 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    placeholder="yourname@srmist.edu.in"
                    value={acadEmail}
                    onChange={(e) => setAcadEmail(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-green-400/50 focus:ring-1 focus:ring-green-400/20 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-green-400/70 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30">
                    <Key className="h-4 w-4" />
                  </div>
                  <input
                    type={showAcadPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={acadPassword}
                    onChange={(e) => setAcadPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-green-400/50 focus:ring-1 focus:ring-green-400/20 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAcadPassword(!showAcadPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/30 hover:text-white/60"
                  >
                    {showAcadPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-cyan-500 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-green-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Connect Academia
                  </>
                )}
              </button>
            </form>
          )}

          {/* SRM Portal Form */}
          {activeTab === "srm_portal" && (
            <form onSubmit={handleSrmLogin} className="p-4 space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-green-400/70 mb-1.5">
                  NetID (without @srmist.edu.in)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="sv3824"
                    value={srmNetId}
                    onChange={(e) => setSrmNetId(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-green-400/50 focus:ring-1 focus:ring-green-400/20 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-green-400/70 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30">
                    <Key className="h-4 w-4" />
                  </div>
                  <input
                    type={showSrmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={srmPassword}
                    onChange={(e) => setSrmPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-green-400/50 focus:ring-1 focus:ring-green-400/20 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSrmPassword(!showSrmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/30 hover:text-white/60"
                  >
                    {showSrmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* CAPTCHA */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-green-400/70 mb-1.5">
                  CAPTCHA
                </label>
                <div className="flex gap-2 items-stretch">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30">
                      <RefreshCw
                        className={`h-4 w-4 ${captchaLoading ? "animate-spin" : ""}`}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Enter captcha"
                      value={captcha}
                      onChange={(e) => setCaptcha(e.target.value)}
                      disabled={loading}
                      required
                      className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-green-400/50 focus:ring-1 focus:ring-green-400/20 transition-all font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3">
                    {captchaLoading ? (
                      <RefreshCw className="h-5 w-5 animate-spin text-white/30" />
                    ) : captchaUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={captchaUrl}
                        alt="CAPTCHA"
                        className="h-8 max-w-[100px] object-contain"
                      />
                    ) : (
                      <span className="text-xs text-red-400">Failed to load</span>
                    )}
                    <button
                      type="button"
                      onClick={handleRefreshCaptcha}
                      disabled={captchaLoading || loading}
                      className="text-white/30 hover:text-white/60 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || captchaLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-cyan-500 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-green-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Connect Student Portal
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-white/20 text-[10px] font-mono">
            privacy • terms
          </p>
        </div>
      </div>
    </div>
  );
}
