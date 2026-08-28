"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Inbox, Search, Users, FileText, Calendar, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type EmptyStateIcon =
  | "inbox"
  | "search"
  | "users"
  | "file"
  | "calendar"
  | "grades"
  | React.ReactNode;

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: EmptyStateIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const IconMap: Record<string, React.ReactNode> = {
  inbox: <Inbox className="h-12 w-12" />,
  search: <Search className="h-12 w-12" />,
  users: <Users className="h-12 w-12" />,
  file: <FileText className="h-12 w-12" />,
  calendar: <Calendar className="h-12 w-12" />,
  grades: <GraduationCap className="h-12 w-12" />,
};

export function EmptyState({
  title,
  description,
  icon = "inbox",
  action,
  className,
}: EmptyStateProps) {
  const iconNode = typeof icon === "string" ? IconMap[icon] || IconMap.inbox : icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-4",
        className
      )}
    >
      <div className="mb-4 text-muted-foreground/60 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        {iconNode}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm" variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}
