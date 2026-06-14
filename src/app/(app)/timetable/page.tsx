"use client";
import React from "react";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import dynamic from "next/dynamic";
import { useAcademiaData } from "@/hooks/useAcademiaData";

const TimetableMinimalist = dynamic(() => import("@/components/themes/minimalist/timetable/Timetable"), { ssr: false });
const TimetableBrutalist = dynamic(() => import("@/components/themes/brutalist/timetable/Timetable"), { ssr: false });

export default function TimetablePage() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <TimetableContent />;
}

function TimetableContent() {
  const { userData } = useApp();
  const { uiStyle } = useTheme();
  const academia = useAcademiaData(userData as any);

  if (uiStyle === "brutalist") {
    return (
      <TimetableBrutalist 
        data={userData as any}
        schedule={academia.effectiveSchedule}
        dayOrder={academia.effectiveDayOrder}
      />
    );
  }

  return (
    <TimetableMinimalist 
      data={userData as any}
      academia={academia}
      startEntrance={true}
    />
  );
}
