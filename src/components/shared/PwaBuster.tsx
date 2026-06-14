"use client";

import { useEffect } from "react";
import { EncryptionUtils } from "@/utils/shared/Encryption";

export default function PwaBuster() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Versioned flag to prevent infinite reload loops during upgrade
      const versionFlag = "sw_cleared_v1.4";
      if (localStorage.getItem(versionFlag) === "true") {
        return;
      }

      navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        if (registrations && registrations.length > 0) {
          console.warn("Found active Service Worker. Unregistering and clearing caches to prevent cache conflicts...");
          
          // Unregister all service workers and wait for the promises to resolve
          for (let registration of registrations) {
            try {
              await registration.unregister();
            } catch (err) {
              console.error("Failed to unregister single SW:", err);
            }
          }
          
          // CRITICAL: Cleanly clear all cookies (ratio_session), sessionStorage, localStorage, and webview caches.
          // This avoids the infinite redirect loop between '/' and '/login'.
          await EncryptionUtils.flushAllStorage();
          
          // Set the flag AFTER flushAllStorage (since flushAllStorage clears localStorage)
          localStorage.setItem(versionFlag, "true");
          
          console.log("Service workers unregistered and storage flushed successfully. Redirecting to login...");
          
          // Hard reload to login screen
          setTimeout(() => {
            window.location.href = "/login";
          }, 300);
        } else {
          // No active service workers found, mark as done to skip checks on future boots
          localStorage.setItem(versionFlag, "true");
        }
      }).catch((e) => {
        console.error("Failed to query SW registrations:", e);
      });
    }
  }, []);

  return null;
}
