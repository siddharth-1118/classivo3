"use client";
import React from "react";
import { useRouter } from "next/navigation";
import OnboardingPage from "@/components/onboarding";

export default function SetupPage() {
  const router = useRouter();

  const handleFinish = () => {
    localStorage.setItem("classivo_setup_bypassed", "true");
    const hasData = localStorage.getItem("classivo_data");
    router.replace(hasData ? "/" : "/login");
  };

  return <OnboardingPage onFinish={handleFinish} />;
}
