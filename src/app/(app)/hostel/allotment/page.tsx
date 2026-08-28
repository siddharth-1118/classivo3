"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SkeletonText } from "@/components/ui/Skeleton";
import { usePortalClient } from "@/lib/hooks/use-portal-client";
import type { HostelData } from "@/lib/types/portal";

export default function HostelAllotmentPage() {
  const { getHostel } = usePortalClient();
  const [data, setData] = React.useState<HostelData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => { getHostel().then(setData).finally(() => setLoading(false)); }, [getHostel]);
  const allotment = data?.allotments?.[0] ?? data?.booking?.allotment;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Allotment Order</h1><p className="mt-1.5 text-muted-foreground">Room allotment, admit card, and declaration availability.</p></div>
      <Card>
        <CardHeader><CardTitle>Allotment</CardTitle><CardDescription>Latest hostel room assignment.</CardDescription></CardHeader>
        <CardContent>
          {loading ? <SkeletonText lines={8} /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Info label="Academic Year" value={allotment?.academicYear ?? data?.hostel.academicYear} />
              <Info label="Hostel Name" value={allotment?.hostelName ?? data?.hostel.hostelName} />
              <Info label="Room No" value={allotment?.roomNo ?? data?.hostel.roomNo} />
              <Info label="Allotment Date" value={allotment?.allotmentDate ?? data?.hostel.allotmentDate} />
              <Info label="Room Type" value={allotment?.roomType} />
              <Info label="Mess Preference" value={allotment?.messPreference} />
              <div className="rounded-lg border border-border/60 p-3"><p className="text-xs font-medium text-muted-foreground">Admit Card</p><Badge className="mt-2" variant={data?.admitCardAvailable ? "success" : "outline"}>{data?.admitCardAvailable ? "Available" : "Not available"}</Badge></div>
              <div className="rounded-lg border border-border/60 p-3"><p className="text-xs font-medium text-muted-foreground">Declaration Form</p><Badge className="mt-2" variant={data?.declarationFormAvailable ? "success" : "outline"}>{data?.declarationFormAvailable ? "Available" : "Not available"}</Badge></div>
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
