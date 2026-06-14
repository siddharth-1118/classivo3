"use client";
import React, { createContext, useContext, useState, useEffect, useMemo } from "react";

interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
  uiStyle: "minimalist" | "brutalist";
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Force color scheme to dark for the unified theme
    document.documentElement.style.colorScheme = 'dark';
    document.documentElement.removeAttribute("data-theme"); // Use default :root

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', '#0F172A'); // Set to new background

    setMounted(true);
  }, []);

  const value = useMemo(() => ({
    theme: "unified",
    setTheme: () => {}, // No-op
    uiStyle: "minimalist" as const,
    isDark: true
  }), []);

  if (!mounted) return <div className="h-[100dvh] w-full bg-[#0F172A]" />;

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
