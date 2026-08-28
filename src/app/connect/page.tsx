"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Lock,
  ShieldCheck,
  RefreshCw,
  LogIn,
  Eye,
  EyeOff,
  GraduationCap,
  AlertTriangle,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { usePortalClient } from "@/lib/hooks/use-portal-client";
import { useTheme } from "@/lib/hooks/use-theme";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { LoginError } from "@/lib/types/portal";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CAPTCHA: "The captcha you entered is incorrect. Please try again.",
  INVALID_CREDENTIALS: "Invalid NetID or password. Please check your credentials.",
  SESSION_EXPIRED: "Your session has expired. Please try again.",
  PORTAL_UNAVAILABLE: "SRM portal is currently unavailable. Please try again later.",
  CONSENT_REQUIRED: "You must provide consent to proceed.",
  VALIDATION_ERROR: "Please check your input and try again.",
  UNAUTHORIZED: "Unauthorized access. Please sign in again.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  INTERNAL_ERROR: "An internal error occurred. Please try again later.",
};

function getErrorMessage(error: LoginError | null): string {
  if (!error) return "";
  if (error.code && ERROR_MESSAGES[error.code]) return ERROR_MESSAGES[error.code];
  if (error.message) return error.message;
  switch (error.type) {
    case "captcha":
      return "Captcha verification failed. Please try again.";
    case "credentials":
      return "Invalid NetID or password.";
    case "portal":
      return "SRM portal is experiencing issues. Please try again later.";
    case "network":
      return "Connection error. Please check your internet.";
    case "session":
      return "Session error. Please try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, lastError, clearError, getCaptcha, refreshCaptcha } = usePortalClient();
  const { toggleTheme, isDark } = useTheme();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [captcha, setCaptcha] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [captchaUrl, setCaptchaUrl] = React.useState<string>("");
  const [requestId, setRequestId] = React.useState<string>("");
  const [captchaLoading, setCaptchaLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const fetchInitialCaptcha = React.useCallback(async () => {
    setCaptchaLoading(true);
    clearError();
    try {
      const result = await getCaptcha();
      setCaptchaUrl(result.captchaUrl);
      setRequestId(result.requestId);
    } catch {
      setCaptchaUrl("");
    } finally {
      setCaptchaLoading(false);
    }
  }, [getCaptcha, clearError]);

  const handleRefreshCaptcha = React.useCallback(async () => {
    if (!requestId) {
      await fetchInitialCaptcha();
      return;
    }
    setCaptchaLoading(true);
    clearError();
    setCaptcha("");
    try {
      const result = await refreshCaptcha(requestId);
      setCaptchaUrl(result.captchaUrl);
      setRequestId(result.requestId);
    } catch {
      await fetchInitialCaptcha();
    } finally {
      setCaptchaLoading(false);
    }
  }, [requestId, refreshCaptcha, fetchInitialCaptcha, clearError]);

  React.useEffect(() => {
    fetchInitialCaptcha();
  }, [fetchInitialCaptcha]);

  React.useEffect(() => {
    try {
      const sid = localStorage.getItem("student_portal_session_id");
      if (sid) router.replace("/dashboard");
    } catch {}
  }, [router]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!username.trim()) e.username = "NetID is required";
    else if (username.trim().length < 3) e.username = "Enter a valid NetID";
    if (!password) e.password = "Password is required";
    else if (password.length < 4) e.password = "Password is too short";
    if (!captcha.trim()) e.captcha = "Captcha is required";
    else if (captcha.trim().length < 4) e.captcha = "Enter the full captcha";
    if (!consent) e.consent = "You must consent to proceed";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const result = await login({
      username: username.trim(),
      password,
      captcha: captcha.trim(),
      requestId,
      consent: true,
    });

    if (result.success) {
      router.replace("/dashboard");
    } else {
      setCaptcha("");
      if (result.error?.code === "INVALID_CAPTCHA") {
        handleRefreshCaptcha();
      }
    }
  };

  const errorDisplay = lastError ? getErrorMessage(lastError) : null;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none" />
      <div
        className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #ef4444 0%, transparent 70%)" }}
      />

      <button
        type="button"
        onClick={toggleTheme}
        className="fixed bottom-6 right-6 z-40 h-10 w-10 rounded-full border border-border bg-background shadow-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-brand shadow-lg shadow-brand-600/25">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            SRM Student Companion
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect your own SRMIST student portal account
          </p>
        </div>

        <Card className="shadow-xl border-border/60 overflow-hidden">
          <CardHeader className="border-b border-border/50 pb-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Welcome back</h2>
              <Badge variant="outline" size="sm">
                <ShieldCheck className="h-3 w-3" />
                Secure
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {errorDisplay && (
              <div
                className={cn(
                  "mb-5 flex gap-3 rounded-lg border p-3.5 text-sm",
                  lastError?.type === "captcha"
                    ? "border-warning-500/30 bg-warning-500/10 text-warning-600 dark:text-warning-500"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                )}
              >
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium mb-0.5">
                    {lastError?.type === "captcha"
                      ? "Captcha Error"
                      : "Sign in failed"}
                  </p>
                  <p className="opacity-90 text-xs leading-relaxed">
                    {errorDisplay}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="text-sm font-medium leading-none"
                >
                  NetID / Registration No.
                </label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. RA2111003010001"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors.username)
                      setErrors((p) => ({ ...p, username: "" }));
                  }}
                  error={errors.username}
                  leftIcon={<User className="h-4 w-4" />}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium leading-none"
                >
                  Password
                </label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Your portal password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password)
                      setErrors((p) => ({ ...p, password: "" }));
                  }}
                  error={errors.password}
                  leftIcon={<Lock className="h-4 w-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-0.5 -m-0.5 rounded"
                      tabIndex={-1}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                  Captcha
                </label>
                <div className="flex gap-3 items-start">
                  <div
                    className={cn(
                      "shrink-0 rounded-lg border border-border overflow-hidden bg-muted h-11 flex items-center justify-center min-w-[140px]",
                      captchaLoading && "animate-pulse"
                    )}
                  >
                    {captchaLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : captchaUrl ? (
                      <img
                        src={captchaUrl}
                        alt="Captcha"
                        className="h-full w-full object-cover"
                        onError={() => setCaptchaUrl("")}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground px-3">
                        No captcha
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      value={captcha}
                      onChange={(e) => {
                        setCaptcha(e.target.value);
                        if (errors.captcha)
                          setErrors((p) => ({ ...p, captcha: "" }));
                      }}
                      placeholder="Enter captcha"
                      error={errors.captcha}
                      disabled={loading || captchaLoading}
                      maxLength={8}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshCaptcha}
                    disabled={loading || captchaLoading}
                    className="shrink-0 h-11 w-11 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Refresh captcha"
                  >
                    <RefreshCw
                      className={cn(
                        "h-4 w-4",
                        captchaLoading && "animate-spin"
                      )}
                    />
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <label
                  className={cn(
                    "flex items-start gap-2.5 text-sm cursor-pointer select-none p-3 rounded-lg border transition-all",
                    errors.consent
                      ? "border-destructive bg-destructive/5"
                      : "border-border hover:border-ring/50 hover:bg-accent/30"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      if (errors.consent)
                        setErrors((p) => ({ ...p, consent: "" }));
                    }}
                    disabled={loading}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-input text-brand-600 focus:ring-ring focus:ring-offset-0"
                  />
                  <span className="leading-relaxed text-muted-foreground">
                    I consent to use my portal credentials only for viewing my
                    own data on this device.
                  </span>
                </label>
                {errors.consent && (
                  <p className="mt-1.5 pl-1 text-xs text-destructive font-medium">
                    {errors.consent}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="brand"
                size="lg"
                className="w-full mt-2"
                loading={loading}
                leftIcon={!loading && <LogIn className="h-4 w-4" />}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Connect to Portal"}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
              <p>Portal password is submitted once and never stored</p>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Having trouble? Contact{" "}
          <Link
            href="mailto:support@srmist.edu.in"
            className="underline-offset-2 hover:underline text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            SRM Helpdesk
          </Link>
        </p>
      </div>
    </div>
  );
}
