"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "@/context/ThemeContext";

const NovaConnections = dynamic(() => import("@/components/themes/nova/NovaConnections"), { ssr: false });

export default function ConnectionsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <ConnectionsContent />;
}

function ConnectionsContent() {
  const { uiStyle } = useTheme();

  if (uiStyle === "nova") {
    return <NovaConnections />;
  }

  // Fallback for other themes
  return <NovaConnections />;
}
