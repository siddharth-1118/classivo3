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
  AlertCircle,
  Eye,
  EyeOff,
  BellOff,
} from "lucide-react";
import { useTheme } from "@/lib/hooks/use-theme";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [captcha, setCaptcha] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const [requestId, setRequestId] = React.useState("");
  const [captchaUrl, setCaptchaUrl] = React.useState("");
  const [captchaLoading, setCaptchaLoading] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch initial captcha on mount
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

  // Refresh captcha
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
      // Fallback to fresh setup
      fetchCaptcha();
    } finally {
      setCaptchaLoading(false);
    }
  }, [requestId, fetchCaptcha]);

  React.useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  // Check if already logged in
  React.useEffect(() => {
    try {
      const userStr = localStorage.getItem("srm_app_user");
      if (userStr) {
        router.replace("/dashboard");
      }
    } catch {}
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password || !captcha.trim() || !requestId) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: username.trim(),
          password,
          captcha: captcha.trim(),
          requestId,
        }),
      });

      localStorage.setItem("srm_app_user", JSON.stringify(result.user ?? { email: `${username}@srmist.edu.in` }));
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setCaptcha("");
      // Automatically refresh captcha on login failure (especially captcha failure)
      handleRefreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 transition-colors duration-200">
      
      {/* Theme Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center text-slate-500 dark:text-zinc-400 transition-all duration-200"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      {/* Main Container */}
      <div className="w-full max-w-6xl flex flex-col items-center">
        
        {/* SRM Banner Header */}
        <div className="w-full mb-8 flex flex-col items-center">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-sky-600 to-indigo-500 dark:from-sky-400 dark:to-indigo-400 bg-clip-text text-transparent">
                SRM Student Companion
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-widest font-semibold">
                Direct Portal Gateway
              </span>
            </div>
          </div>
        </div>

        {/* Content Box */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left panel: Info */}
          <div className="lg:col-span-5 flex flex-col justify-center p-6 md:p-8 bg-white dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-zinc-900 shadow-sm leading-relaxed">
            <h2 className="text-xl font-bold text-sky-700 dark:text-sky-400 mb-4">
              Dear Student,
            </h2>
            <div className="space-y-4 text-sm text-slate-600 dark:text-zinc-300">
              <p className="font-semibold text-slate-700 dark:text-zinc-200">
                Welcome to SRMIST STUDENT PORTAL.
              </p>
              <p>
                You can access student portal to know your academic and financial details etc.
              </p>
              <div className="p-4 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100/50 dark:border-sky-900/30 text-xs text-sky-800 dark:text-sky-300">
                SRMIST students can login with NetID credentials. (i.e. If your mail ID is <code className="font-mono bg-sky-100 dark:bg-sky-900/50 px-1 py-0.5 rounded">abcd@srmist.edu.in</code>, your NetID is <code className="font-mono bg-sky-100 dark:bg-sky-900/50 px-1 py-0.5 rounded">abcd</code> &amp; password will be your e-mail password).
              </div>
            </div>
          </div>

          {/* Right panel: Login Form */}
          <div className="lg:col-span-7 flex flex-col">
            <Card className="h-full border-slate-200/80 dark:border-zinc-800/80 shadow-2xl overflow-hidden rounded-2xl">
              
              {/* Card Header matching SRM style */}
              <div className="bg-sky-600 dark:bg-sky-800 text-white px-6 py-4.5 flex items-center justify-between shadow-sm">
                <span className="font-bold text-base tracking-wide uppercase">
                  Student Portal
                </span>
                <span className="text-[10px] bg-sky-500/30 px-2.5 py-1 rounded-full font-semibold border border-sky-400/20">
                  Secure HTTPS Connection
                </span>
              </div>

              <CardContent className="p-6 md:p-8 space-y-6">
                
                {/* Error Banner */}
                {error && (
                  <div className="flex items-start gap-4 p-4 bg-[#fde8e8] dark:bg-rose-950/20 text-[#9b1c1c] dark:text-rose-400 text-sm rounded-xl">
                    <BellOff className="h-5 w-5 shrink-0 mt-0.5 text-[#9b1c1c] dark:text-rose-400" />
                    <div>
                      <p className="font-bold text-[#9b1c1c] dark:text-rose-300">Alert</p>
                      <p className="text-xs mt-1 leading-relaxed font-medium">{error}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  
                  {/* Username/NetID */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                      NetID (without '@srmist.edu.in')
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        placeholder="sv3824"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={loading}
                        required
                        className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                        Password
                      </label>
                      <a
                        href="https://sp.srmist.edu.in/srmiststudentportal/students/loginManager/forgotPassword.jsp"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        Forgot Password?
                      </a>
                    </div>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                        <Key className="h-4 w-4" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                        className="block w-full pl-10 pr-10 py-3 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Captcha */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                      Captcha
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      
                      {/* Input field with refresh icon inside left decoration */}
                      <div className="md:col-span-6 relative rounded-lg shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-zinc-500">
                          <RefreshCw className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          placeholder="Captcha"
                          value={captcha}
                          onChange={(e) => setCaptcha(e.target.value)}
                          disabled={loading}
                          required
                          className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-transparent transition-all"
                        />
                      </div>

                      {/* Captcha Image and reload */}
                      <div className="md:col-span-6 flex items-center justify-between gap-3 bg-slate-100/60 dark:bg-zinc-900/80 p-1.5 rounded-xl border border-slate-200/50 dark:border-zinc-800/50 h-[48px]">
                        <div className="flex-1 flex items-center justify-center overflow-hidden h-full">
                          {captchaLoading ? (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              <span>Loading...</span>
                            </div>
                          ) : captchaUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={captchaUrl}
                              alt="Portal Captcha"
                              className="h-full max-w-full object-contain rounded"
                            />
                          ) : (
                            <span className="text-xs text-rose-500">Error loading captcha</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleRefreshCaptcha}
                          disabled={captchaLoading || loading}
                          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                          aria-label="Refresh Captcha"
                        >
                          <RefreshCw className={`h-4 w-4 ${captchaLoading ? "animate-spin" : ""}`} />
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={loading || captchaLoading}
                      className="w-full py-6 text-sm font-semibold rounded-xl bg-sky-600 dark:bg-sky-700 text-white hover:bg-sky-700 dark:hover:bg-sky-600 flex items-center justify-center gap-2 shadow-lg shadow-sky-600/10 active:scale-[0.98] transition-all duration-150"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Logging in and syncing...</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="h-4 w-4" />
                          <span>Login</span>
                        </>
                      )}
                    </Button>
                  </div>

                </form>
              </CardContent>
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
}
