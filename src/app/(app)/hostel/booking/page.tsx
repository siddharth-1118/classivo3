"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SkeletonText } from "@/components/ui/Skeleton";
import { usePortalClient } from "@/lib/hooks/use-portal-client";
import type { HostelData } from "@/lib/types/portal";

export default function HostelBookingPage() {
  const { getHostel } = usePortalClient();
  const [data, setData] = React.useState<HostelData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getHostel().then(setData).finally(() => setLoading(false));
  }, [getHostel]);

  const booking = data?.booking;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Hostel Booking</h1><p className="mt-1.5 text-muted-foreground">Booking status and progress labels from the portal.</p></div>
      <Card>
        <CardHeader><CardTitle>Booking Details</CardTitle><CardDescription>Latest synced hostel application state.</CardDescription></CardHeader>
        <CardContent>
          {loading ? <SkeletonText lines={7} /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Info label="Academic Year" value={booking?.academicYear ?? data?.hostel.academicYear} />
              <Info label="Application Date" value={booking?.applicationDate} />
              <Info label="Preferred Hostel" value={booking?.preferredHostel ?? data?.hostel.hostelName} />
              <Info label="Preferred Room Type" value={booking?.preferredRoomType} />
              <Info label="Booking Stage" value={booking?.bookingStage} />
              <div className="rounded-lg border border-border/60 p-3"><p className="text-xs font-medium text-muted-foreground">Status</p><Badge className="mt-2">{booking?.status ?? "Not available"}</Badge></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return <div className="rounded-lg border border-border/60 p-3"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value || "Not available"}</p></div>;
}
