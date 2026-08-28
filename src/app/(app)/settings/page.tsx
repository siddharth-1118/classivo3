"use client";

import * as React from "react";
import { LogOut, RefreshCw, ShieldOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { usePortalClient } from "@/lib/hooks/use-portal-client";

export default function SettingsPage() {
  const { refreshAll, logout } = usePortalClient();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);

  const disconnect = async () => {
    setBusy("disconnect");
    try {
      await fetch("/api/portal/disconnect", { method: "POST", credentials: "include" });
      localStorage.removeItem("student_portal_session_id");
      toast({ title: "Portal disconnected", description: "Your portal session has been revoked.", variant: "success" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1><p className="mt-1.5 text-muted-foreground">Connection controls, sync actions, and account session options.</p></div>
      <Card>
        <CardHeader><CardTitle>Portal Connection</CardTitle><CardDescription>Portal credentials are not stored after connection. Session artifacts stay server-side.</CardDescription></CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <Badge variant="outline">SRMIST Portal</Badge>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" loading={busy === "refresh"} leftIcon={<RefreshCw className="h-4 w-4" />} onClick={async () => { setBusy("refresh"); try { await refreshAll(); } finally { setBusy(null); } }}>Refresh All</Button>
            <Button variant="destructive" loading={busy === "disconnect"} leftIcon={<ShieldOff className="h-4 w-4" />} onClick={disconnect}>Disconnect</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>App Session</CardTitle><CardDescription>Sign out of SRM Student Companion on this device.</CardDescription></CardHeader>
        <CardContent>
          <Button variant="outline" leftIcon={<LogOut className="h-4 w-4" />} onClick={logout}>Sign Out</Button>
        </CardContent>
      </Card>
    </div>
  );
}
