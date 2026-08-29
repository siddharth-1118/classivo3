"use client";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Navbar from "./Navbar";

interface MinimalThemeProps {
  children: React.ReactNode;
  isSwipeDisabled?: boolean;
}

export default function MinimalTheme({ children }: MinimalThemeProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isSubpage =
    pathname !== "/" &&
    pathname !== "/nest" &&
    pathname !== "/login" &&
    pathname !== "/onboarding";

  return (
    <div
      className={`h-full w-full bg-theme-bg flex flex-col overflow-hidden relative`}
      style={{ transform: "translateZ(0)" }}
    >
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {children}
      </div>
      <Navbar />
    </div>
  );
}
