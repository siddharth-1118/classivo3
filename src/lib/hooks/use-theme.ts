"use client";

import * as React from "react";
import { useTheme as useNextTheme } from "next-themes";

export interface UseThemeReturn {
  theme: string | undefined;
  setTheme: (theme: string) => void;
  resolvedTheme: string | undefined;
  themes: string[];
  toggleTheme: () => void;
  isDark: boolean;
}

export function useTheme(): UseThemeReturn {
  const { theme, setTheme, resolvedTheme, themes } = useNextTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = React.useCallback(() => {
    if (!mounted) return;
    const current = resolvedTheme || theme;
    setTheme(current === "dark" ? "light" : "dark");
  }, [mounted, resolvedTheme, theme, setTheme]);

  const isDark = React.useMemo(() => {
    if (!mounted) return false;
    return (resolvedTheme || theme) === "dark";
  }, [mounted, resolvedTheme, theme]);

  return {
    theme,
    setTheme,
    resolvedTheme,
    themes,
    toggleTheme,
    isDark,
  };
}
