"use client";
import React from "react";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import dynamic from "next/dynamic";

const MarksMinimalist = dynamic(() => import("@/components/themes/minimalist/marks/Marks"), { ssr: false });
const MarksBrutalist = dynamic(() => import("@/components/themes/brutalist/marks/Marks"), { ssr: false });

export default function MarksPage() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <MarksContent />;
}

function MarksContent() {
  const { userData } = useApp();
  const { uiStyle } = useTheme();

  if (uiStyle === "brutalist") {
    return (
      <MarksBrutalist 
        data={userData as any}
      />
    );
  }

  return (
    <MarksMinimalist 
      data={userData as any}
    />
  );
}
