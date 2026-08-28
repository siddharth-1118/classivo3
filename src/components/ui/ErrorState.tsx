"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { AlertTriangle, AlertCircle, WifiOff, ServerCrash, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type ErrorStateVariant = "error" | "network" | "server" | "warning";

export interface ErrorStateProps {
  title: string;
  description?: string;
  variant?: ErrorStateVariant;
  retry?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
  };
  className?: string;
}

const VariantConfig: Record<
  ErrorStateVariant,
  { icon: React.ReactNode; iconBg: string; iconColor: string }
> = {
  error: {
    icon: <AlertCircle className="h-12 w-12" />,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
  },
  network: {
    icon: <WifiOff className="h-12 w-12" />,
    iconBg: "bg-warning-500/10",
    iconColor: "text-warning-500",
  },
  server: {
    icon: <ServerCrash className="h-12 w-12" />,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
  },
  warning: {
    icon: <AlertTriangle className="h-12 w-12" />,
    iconBg: "bg-warning-500/10",
    iconColor: "text-warning-500",
  },
};

export function ErrorState({
  title,
  description,
  variant = "error",
  retry,
  className,
}: ErrorStateProps) {
  const config = VariantConfig[variant];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-4",
        className
      )}
    >
      <div
        className={cn(
          "mb-4 flex h-20 w-20 items-center justify-center rounded-full",
          config.iconBg,
          config.iconColor
        )}
      >
        {config.icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {description}
        </p>
      )}
      {retry && (
        <Button
          onClick={retry.onClick}
          size="sm"
          variant="outline"
          loading={retry.loading}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          {retry.label}
        </Button>
      )}
    </div>
  );
}
