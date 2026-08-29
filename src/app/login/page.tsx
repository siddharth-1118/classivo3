"use client";
import React, { useEffect } from "react";
import LoginPage from "@/components/shared/LoginPage";
import NovaLogin from "@/components/themes/nova/NovaLogin";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import { EncryptionUtils } from "@/utils/shared/Encryption";

export default function LoginRoute() {
  const { setUserData, setConnectionSource, setConnectedAt, setLastSyncAt } = useApp();
  const { uiStyle } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const hasSession = document.cookie.includes("classivo_session=");
    const hasData = !!localStorage.getItem("classivo_data");
    if (hasSession && hasData) {
      router.replace("/");
    }
    // If stale cookie exists but no data, clear it so login works cleanly
    if (hasSession && !hasData) {
      document.cookie = "classivo_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    }
  }, [router]);

  const handleLoginSuccess = (data: any) => {
    setUserData(data);
    localStorage.setItem("classivo_data", JSON.stringify(data));
    EncryptionUtils.setSessionCookie();
    
    const source = data.source || "academia";
    const now = new Date().toISOString();
    setConnectionSource(source);
    setConnectedAt(now);
    setLastSyncAt(now);
    localStorage.setItem("classivo_connection_source", source);
    localStorage.setItem("classivo_connected_at", now);
    localStorage.setItem("classivo_last_sync_at", now);

    router.replace("/");
  };

  if (uiStyle === "nova") {
    return (
      <div className="w-full h-full bg-[#FDFDFA]">
        <NovaLogin onLogin={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-theme-bg">
      <LoginPage onLogin={handleLoginSuccess} />
    </div>
  );
}