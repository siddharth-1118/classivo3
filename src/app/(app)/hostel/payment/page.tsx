"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SkeletonText } from "@/components/ui/Skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { usePortalClient } from "@/lib/hooks/use-portal-client";
import type { HostelData } from "@/lib/types/portal";

export default function HostelPaymentPage() {
  const { getHostel } = usePortalClient();
  const [data, setData] = React.useState<HostelData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => { getHostel().then(setData).finally(() => setLoading(false)); }, [getHostel]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Payment Confirmation</h1><p className="mt-1.5 text-muted-foreground">Hostel fee payment records and receipt metadata.</p></div>
      <Card>
        <CardHeader><CardTitle>Payments</CardTitle><CardDescription>{data?.payments.length ?? 0} payment records</CardDescription></CardHeader>
        <CardContent>
          {loading ? <SkeletonText lines={8} /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Academic Year</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Mode</TableHead><TableHead>Status</TableHead><TableHead>Receipt</TableHead></TableRow></TableHeader>
              <TableBody>{(data?.payments ?? []).map((p, i) => <TableRow key={i}><TableCell>{p.academicYear}</TableCell><TableCell>{p.feeDescription}</TableCell><TableCell>{p.feeAmount}</TableCell><TableCell>{p.payMode}</TableCell><TableCell><Badge variant={p.status === "Paid" ? "success" : "warning"}>{p.status}</Badge></TableCell><TableCell>{p.receiptNumber ?? "-"}</TableCell></TableRow>)}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
