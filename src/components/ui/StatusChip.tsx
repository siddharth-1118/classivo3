"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { CheckCircle2, XCircle, Clock, AlertCircle, Loader2 } from "lucide-react";

export type StatusVariant =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "pending"
  | "loading"
  | "default";

export interface StatusChipProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: StatusVariant;
  label?: string;
  showDot?: boolean;
  showIcon?: boolean;
}

const StatusChip: React.FC<StatusChipProps> = ({
  className,
  status = "default",
  label,
  showDot = true,
  showIcon = false,
  children,
  ...props
}) => {
  const variants: Record<StatusVariant, { wrapper: string; dot: string }> = {
    success: {
      wrapper:
        "bg-success-500/10 text-success-600 dark:text-success-500 border-success-500/20",
      dot: "bg-success-500",
    },
    error: {
      wrapper:
        "bg-destructive/10 text-destructive border-destructive/20",
      dot: "bg-destructive",
    },
    warning: {
      wrapper:
        "bg-warning-500/10 text-warning-600 dark:text-warning-500 border-warning-500/20",
      dot: "bg-warning-500",
    },
    info: {
      wrapper:
        "bg-info-500/10 text-info-600 dark:text-info-500 border-info-500/20",
      dot: "bg-info-500",
    },
    pending: {
      wrapper:
        "bg-warning-500/10 text-warning-600 dark:text-warning-500 border-warning-500/20",
      dot: "bg-warning-500",
    },
    loading: {
      wrapper:
        "bg-brand-500/10 text-brand-600 dark:text-brand-500 border-brand-500/20",
      dot: "bg-brand-500",
    },
    default: {
      wrapper:
        "bg-muted text-muted-foreground border-border",
      dot: "bg-muted-foreground",
    },
  };

  const Icons: Record<StatusVariant, React.ReactNode> = {
    success: <CheckCircle2 className="h-3.5 w-3.5" />,
    error: <XCircle className="h-3.5 w-3.5" />,
    warning: <AlertCircle className="h-3.5 w-3.5" />,
    info: <AlertCircle className="h-3.5 w-3.5" />,
    pending: <Clock className="h-3.5 w-3.5" />,
    loading: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    default: null,
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        variants[status].wrapper,
        className
      )}
      {...props}
    >
      {showIcon && Icons[status]}
      {!showIcon && showDot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            status === "loading" ? "animate-pulse" : "",
            variants[status].dot
          )}
        />
      )}
      {label || children}
    </div>
  );
};

export { StatusChip };
