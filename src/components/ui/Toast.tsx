"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { CheckCircle2, XCircle, AlertCircle, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "warning" | "info" | "default";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4000;

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const ToastIcons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-success-500 shrink-0" />,
  error: <XCircle className="h-5 w-5 text-destructive shrink-0" />,
  warning: <AlertCircle className="h-5 w-5 text-warning-500 shrink-0" />,
  info: <Info className="h-5 w-5 text-info-500 shrink-0" />,
  default: <Info className="h-5 w-5 text-muted-foreground shrink-0" />,
};

const ToastVariantStyles: Record<ToastVariant, string> = {
  success: "border-l-4 border-l-success-500",
  error: "border-l-4 border-l-destructive",
  warning: "border-l-4 border-l-warning-500",
  info: "border-l-4 border-l-info-500",
  default: "",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (t: Omit<Toast, "id">): string => {
      const id = generateId();
      const newToast: Toast = {
        id,
        duration: DEFAULT_DURATION,
        variant: "default",
        ...t,
      };
      setToasts((prev) => [...prev, newToast]);
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => remove(id), newToast.duration);
      }
      return id;
    },
    [remove]
  );

  const dismiss = React.useCallback(
    (id: string) => {
      remove(id);
    },
    [remove]
  );

  const clear = React.useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, clear }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-end justify-end gap-2 p-4 sm:p-6">
      <div className="flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto animate-fade-in rounded-lg border border-border bg-popover text-popover-foreground shadow-lg shadow-black/5 p-4 pr-10 relative",
              ToastVariantStyles[t.variant || "default"]
            )}
            role="status"
          >
            <button
              onClick={() => onDismiss(t.id)}
              className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex gap-3">
              {ToastIcons[t.variant || "default"]}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-none mb-1">
                  {t.title}
                </p>
                {t.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
