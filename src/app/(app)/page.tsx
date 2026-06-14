"use client";
import React, { useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import dynamic from "next/dynamic";
import { useAcademiaData } from "@/hooks/useAcademiaData";
import { useAppLayout } from "@/context/AppLayoutContext";
import { EncryptionUtils } from "@/utils/shared/Encryption";

const DashboardMinimalist = dynamic(() => import("@/components/themes/minimalist/dashboard/Dashboard"), { ssr: false });

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <DashboardContent />;
}

function DashboardContent() {
  const { userData, customDisplayName, refreshData, isUpdating } = useApp();
  const { onOpenSettings } = useAppLayout();
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const academia = useAcademiaData(userData as any);

  const handleRefresh = useCallback(async () => {
    const creds = EncryptionUtils.loadDecrypted("ratio_credentials");
    if (creds && userData) {
      await refreshData(creds, userData);
    }
  }, [userData, refreshData]);

  return (
    <DashboardMinimalist 
      data={userData as any}
      academia={academia}
      onOpenSettings={onOpenSettings}
      isAlertsOpen={isAlertsOpen}
      setIsAlertsOpen={setIsAlertsOpen}
      startEntrance={true}
      onRefresh={handleRefresh}
      isRefreshing={isUpdating}
    />
  );
}
