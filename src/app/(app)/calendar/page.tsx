"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import { useAcademiaData } from "@/hooks/useAcademiaData";

const CalendarMinimalist = dynamic(() => import("@/components/themes/minimalist/calendar/Calendar"), { ssr: false });
const CalendarBrutalist = dynamic(() => import("@/components/themes/brutalist/calendar/Calendar"), { ssr: false });

export default function CalendarPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <CalendarContent />;
}

function CalendarContent() {
  const { userData } = useApp();
  const { uiStyle } = useTheme();
  const academia = useAcademiaData(userData as any);

  if (uiStyle === "brutalist") {
    return (
      <CalendarBrutalist 
        data={userData as any}
        academia={academia}
      />
    );
  }

  return (
    <CalendarMinimalist 
      data={userData as any}
      academia={academia}
    />
  );
}
