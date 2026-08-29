"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Megaphone } from "lucide-react";

interface ToastData {
  id: string;
  title: string;
  message: string;
}

export default function AdminNotificationToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { title, message } = (e as CustomEvent).detail || {};
      if (!title && !message) return;

      const id = `toast-${Date.now()}-${Math.random()}`;
      const toast: ToastData = {
        id,
        title: title || "Admin Message",
        message: message || "",
      };

      setToasts((prev) => [toast, ...prev].slice(0, 3)); // max 3 stacked toasts

      // Auto-dismiss after 6 seconds
      setTimeout(() => removeToast(id), 6000);
    };

    window.addEventListener("admin_broadcast_received", handler);
    return () => window.removeEventListener("admin_broadcast_received", handler);
  }, [removeToast]);

  return (
    <div className="fixed top-4 left-0 right-0 z-[99999] flex flex-col items-center gap-2 pointer-events-none px-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="pointer-events-auto w-full max-w-sm"
          >
            <div
              className="relative rounded-2xl border overflow-hidden"
              style={{
                background: "rgba(18, 18, 28, 0.92)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                borderColor: "rgba(120, 80, 255, 0.35)",
                boxShadow:
                  "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(120,80,255,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              {/* Glow bar at top */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(150,100,255,0.8), rgba(100,200,255,0.8), transparent)",
                }}
              />

              <div className="flex items-start gap-3 p-4 pr-3">
                {/* Icon */}
                <div
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
                  style={{
                    background: "rgba(120, 80, 255, 0.15)",
                    border: "1px solid rgba(120, 80, 255, 0.3)",
                  }}
                >
                  <Megaphone size={16} className="text-purple-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[9px] font-black uppercase tracking-[0.18em]"
                      style={{ color: "rgba(180, 140, 255, 0.8)" }}
                    >
                      Admin · Classivo
                    </span>
                  </div>
                  <p className="text-[13px] font-bold text-white leading-snug truncate">
                    {toast.title}
                  </p>
                  {toast.message && (
                    <p
                      className="text-[11px] mt-0.5 leading-relaxed line-clamp-2"
                      style={{ color: "rgba(200,200,220,0.7)" }}
                    >
                      {toast.message}
                    </p>
                  )}
                </div>

                {/* Dismiss */}
                <button
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: "rgba(200,200,220,0.4)" }}
                >
                  <X size={13} />
                </button>
              </div>

              {/* Progress bar (drains over 6s) */}
              <div
                className="h-[2px] mx-4 mb-3 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(120,80,255,0.8), rgba(100,200,255,0.8))",
                  }}
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 6, ease: "linear" }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
