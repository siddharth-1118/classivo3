"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "brand"
  | "srm"
  | "success"
  | "warning"
  | "info";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
}

const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  size = "sm",
  ...props
}) => {
  const variants: Record<BadgeVariant, string> = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    secondary:
      "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive:
      "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground border border-border",
    brand: "bg-brand-600 text-white hover:bg-brand-700",
    srm: "bg-srm-600 text-white hover:bg-srm-700",
    success:
      "bg-success-500/15 text-success-600 dark:text-success-500 border border-success-500/20",
    warning:
      "bg-warning-500/15 text-warning-600 dark:text-warning-500 border border-warning-500/20",
    info:
      "bg-info-500/15 text-info-600 dark:text-info-500 border border-info-500/20",
  };

  const sizes = {
    sm: "text-[11px] px-2 py-0.5 rounded-md font-medium",
    md: "text-xs px-2.5 py-1 rounded-md font-medium",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 transition-colors",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
};

export { Badge };
