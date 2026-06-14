"use client";
import React from "react";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import dynamic from "next/dynamic";
import { useAcademiaData } from "@/hooks/useAcademiaData";

const AttendanceMinimalist = dynamic(() => import("@/components/themes/minimalist/attendance/Attendance"), { ssr: false });
const AttendanceBrutalist = dynamic(() => import("@/components/themes/brutalist/attendance/Attendance"), { ssr: false });
export default function AttendancePage() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <AttendanceContent />;
}

function AttendanceContent() {
  const { userData } = useApp();
  const { uiStyle } = useTheme();
  const academia = useAcademiaData(userData as any);

  if (uiStyle === "brutalist") {
    return (
      <AttendanceBrutalist 
        data={userData as any}
        academia={academia}
      />
    );
  }

  return (
    <AttendanceMinimalist 
      data={userData as any}
      academia={academia}
    />
  );
}
