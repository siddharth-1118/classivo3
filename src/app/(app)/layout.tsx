"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { usePortalClient } from "@/lib/hooks/use-portal-client";
import { cn } from "@/lib/utils/cn";

function ProtectedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { sessionId } = usePortalClient();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    let sid: string | null = null;
    try {
      sid = localStorage.getItem("srm_app_user");
    } catch {}

    if (!sid && !sessionId) {
      router.replace("/login");
      return;
    }
    setChecked(true);
  }, [sessionId, router]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 xl:pl-72">
        <Header onMobileMenuOpen={() => setSidebarOpen(true)} />

        <main
          className={cn(
            "min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
          )}
        >
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedShell>{children}</ProtectedShell>;
}
