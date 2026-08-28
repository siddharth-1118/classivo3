"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  UserCircle2,
  LogOut,
  RefreshCw,
  Sun,
  Moon,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { usePortalClient } from "@/lib/hooks/use-portal-client";
import { useTheme } from "@/lib/hooks/use-theme";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { MobileMenuButton } from "./Sidebar";

interface HeaderProps {
  onMobileMenuOpen: () => void;
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "Never";
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "Unknown";
  }
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Header({ onMobileMenuOpen }: HeaderProps) {
  const router = useRouter();
  const { studentName, logout, refreshAll, loading } = usePortalClient();
  const { toggleTheme, isDark } = useTheme();
  const { toast } = useToast();
  const [lastSynced, setLastSynced] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [, forceUpdate] = React.useState(0);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("student_portal_last_sync");
      setLastSynced(stored);
    } catch {}
  }, []);

  React.useEffect(() => {
    const interval = setInterval(() => forceUpdate((x) => x + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
      const now = new Date().toISOString();
      setLastSynced(now);
      try {
        localStorage.setItem("student_portal_last_sync", now);
      } catch {}
      toast({
        title: "Refreshed",
        description: "All your data has been updated.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Refresh failed",
        description: "Could not refresh data. Please try again.",
        variant: "error",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      try {
        localStorage.removeItem("student_portal_last_sync");
      } catch {}
      toast({
        title: "Signed out",
        description: "You have been safely signed out.",
        variant: "info",
      });
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 h-16 glass border-b border-border/60">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <MobileMenuButton onClick={onMobileMenuOpen} />

          <div className="min-w-0 hidden sm:flex sm:items-center sm:gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1.5">
              <div
                className={cn(
                  "h-8 w-8 shrink-0 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold shadow-sm"
                )}
                aria-hidden="true"
              >
                {getInitials(studentName)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">
                  {studentName || "Student"}
                </p>
                {studentName && (
                  <p className="text-[11px] text-muted-foreground truncate leading-tight">
                    Signed in
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex md:items-center">
            <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/50 px-3 py-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap font-medium">
                Last synced: {formatRelativeTime(lastSynced)}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            loading={refreshing || loading}
            aria-label="Refresh all data"
            title="Refresh all data"
          >
            {!refreshing && !loading && (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <div className="sm:hidden">
            <div
              className={cn(
                "h-9 w-9 shrink-0 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold"
              )}
              aria-hidden="true"
            >
              {getInitials(studentName)}
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            loading={loggingOut}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            aria-label="Sign out"
            title="Sign out"
          >
            {!loggingOut && <LogOut className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
