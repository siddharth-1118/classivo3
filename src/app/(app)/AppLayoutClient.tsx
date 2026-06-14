"use client";
import React, { useState, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import SettingsPage from "@/components/shared/SettingsPage";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import { useAcademiaData } from "@/hooks/useAcademiaData";

import BrutalistThemeLayout from "@/components/themes/brutalist/BrutalistTheme";
import MinimalistThemeLayout from "@/components/themes/minimalist/MinimalTheme";

import { AppLayoutContext } from "@/context/AppLayoutContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { userData, logout, customDisplayName, setCustomDisplayName, isUpdating, setIsUpdateHistoryOpen, isInitialized } = useApp();
  const { theme, setTheme, uiStyle, isDark } = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSwipeDisabled, setIsSwipeDisabled] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const academia = useAcademiaData(userData as any);
  const router = useRouter();
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  useEffect(() => {
    if (!isInitialized || isAdminRoute) return;

    const checkRedirect = () => {
      const hasData = localStorage.getItem("classivo_data");
      const hasCreds = localStorage.getItem("classivo_credentials");

      if (hasData && userData && !userData.profile) {
        console.warn("Corrupted user data detected. Redirecting to login...");
        localStorage.removeItem("classivo_data");
        localStorage.removeItem("classivo_credentials");
        setIsRedirecting(true);
        router.replace("/login");
        return true;
      }

      if (!userData && !hasData && !hasCreds) {
        if (pathname !== "/") {
          setIsRedirecting(true);
          router.replace("/login");
          return true;
        }
      }
      return false;
    };

    const redirected = checkRedirect();
    if (!redirected) {
      setIsRedirecting(false);
    }
  }, [router, userData, isInitialized, isAdminRoute]);

  const handleUpdateName = (name: string) => {
    setCustomDisplayName(name);
    localStorage.setItem("classivo_custom_name", name);
  };

  if (isAdminRoute) {
    return (
      <div className="h-full w-full bg-theme-bg overflow-auto">
        {children}
      </div>
    );
  }

  if (!isInitialized || isRedirecting) {
    return (
      <div className="fixed inset-0 z-[9999] bg-theme-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-theme-emphasis border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-theme-muted animate-pulse">
            {isRedirecting ? "Redirecting..." : "syncing session..."}
          </span>
        </div>
      </div>
    );
  }

  const sharedProps = {
    data: userData as any,
    academia,
    onLogout: logout,
    customDisplayName,
    onUpdateName: handleUpdateName,
    startEntrance: true,
    isDark,
    onOpenSettings: () => setIsSettingsOpen(true),
    isUpdating,
    isSwipeDisabled
  };

  return (
    <AppLayoutContext.Provider value={{ 
      onOpenSettings: () => setIsSettingsOpen(true),
      isSwipeDisabled,
      setIsSwipeDisabled
    }}>
      <div className="h-full w-full bg-theme-bg overflow-hidden relative">
        {!userData && pathname === "/" ? (
          <div className="h-full w-full overflow-auto bg-[#0a0d17]">
            {children}
          </div>
        ) : uiStyle === "brutalist" ? (
          <BrutalistThemeLayout {...sharedProps}>
            {children}
          </BrutalistThemeLayout>
        ) : (
          <MinimalistThemeLayout {...sharedProps}>
            {children}
          </MinimalistThemeLayout>
        )}

        <AnimatePresence>
          {isSettingsOpen && (
            <SettingsPage
              onBack={() => setIsSettingsOpen(false)}
              onLogout={logout}
              profile={{
                ...userData?.profile,
                name: customDisplayName || userData?.profile?.name || "Student",
              }}
              onUpdateName={handleUpdateName}
              onSelectTheme={(newTheme) => {
                setTheme(newTheme);
                setIsSettingsOpen(false);
              }}
              currentTheme={theme}
            />
          )}
        </AnimatePresence>
      </div>
    </AppLayoutContext.Provider>
  );
}
