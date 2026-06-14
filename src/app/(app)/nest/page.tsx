"use client";
import React, { useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { EncryptionUtils } from "@/utils/shared/Encryption";

const NEST_URL = process.env.NEXT_PUBLIC_NEST_URL || "https://srm-nest-bridge.loca.lt";
const NEST_API_URL = process.env.NEXT_PUBLIC_BACKEND_URLS || "https://srm-nest-bridge.loca.lt";
const SSO_SECRET = process.env.NEXT_PUBLIC_SSO_SECRET || "ratio_d_internal_secret_token_123";

export default function NestPage() {
  const { uiStyle } = useTheme();
  const { userData } = useApp();
  const [ssoUrl, setSsoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function getSso() {
      try {
        const creds = EncryptionUtils.loadDecrypted("ratio_credentials");
        const email = creds?.username;
        if (!email) {
          setSsoUrl(NEST_URL);
          return;
        }

        const res = await fetch(`${NEST_API_URL}/api/auth/sso`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "bypass-tunnel-reminder": "true" },
          body: JSON.stringify({ 
            email: email, 
            profile: userData?.profile || {},
            secret: SSO_SECRET
          })
        });

        const data = await res.json();
        
        if (data.success) {
          const params = new URLSearchParams({
            ssoToken: data.token,
          });
          setSsoUrl(`${NEST_URL}/auth?${params.toString()}`);
        } else {
          setSsoUrl(NEST_URL);
        }
      } catch (err) {
        console.error("SSO failed", err);
        setSsoUrl(NEST_URL);
      }
    }

    getSso();
  }, [userData]);

  if (!ssoUrl) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${uiStyle === "brutalist" ? "bg-black" : "bg-theme-bg"}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#E2C974] border-t-transparent animate-spin" />
          <p className="text-[#E2C974] font-black uppercase tracking-widest text-xs font-title-md">Entering Classivo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-[100dvh] ${uiStyle === "brutalist" ? "bg-black pb-[100px]" : "bg-theme-bg"}`}>
      <iframe 
        src={ssoUrl} 
        className="w-full h-full border-none"
        title="Classivo"
        allow="clipboard-read; clipboard-write; geolocation"
      />
    </div>
  );
}
