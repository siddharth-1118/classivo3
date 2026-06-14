"use client";
import React, { useEffect } from "react";
import LoginPage from "@/components/shared/LoginPage";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { EncryptionUtils } from "@/utils/shared/Encryption";

export default function LoginRoute() {
  const { setUserData } = useApp();
  const router = useRouter();

  useEffect(() => {
    const hasSession = document.cookie.includes("classivo_session=");
    if (hasSession) {
      router.replace("/");
    }
  }, [router]);

  const handleLoginSuccess = (data: any) => {
    setUserData(data);
    localStorage.setItem("classivo_data", JSON.stringify(data));
    EncryptionUtils.setSessionCookie();
    router.replace("/");
  };

  return (
    <div className="w-full h-full bg-theme-bg">
      <LoginPage onLogin={handleLoginSuccess} />
    </div>
  );
}
