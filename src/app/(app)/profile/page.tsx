"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { SkeletonText } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { usePortalClient } from "@/lib/hooks/use-portal-client";
import type { ProfileData } from "@/lib/types/portal";

export default function ProfilePage() {
  const { getProfile } = usePortalClient();
  const [data, setData] = React.useState<ProfileData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getProfile());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [getProfile]);

  React.useEffect(() => { load(); }, [load]);

  if (error && !loading) {
    return <ErrorState title="Profile unavailable" description={error} retry={{ label: "Retry", onClick: load }} />;
  }

  const rows = data ? [
    ["Student Name", data.studentName],
    ["Student ID", data.studentId],
    ["Register No", data.registerNo],
    ["Email ID", data.emailId],
    ["Institution", data.institution],
    ["Program", data.program],
    ["Semester", String(data.semester)],
    ["Batch", data.batch],
    ["Section", data.section],
    ["Room No", data.roomNo],
    ["Course Enrollment Date", data.currentSemCourseEnrollmentDate],
    ["Faculty Advisor", data.facultyAdvisor],
    ["Academic Advisor", data.academicAdvisor],
    ["Current Status", data.currentStatus],
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1.5 text-muted-foreground">Your synced SRMIST student profile.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Student Details</CardTitle>
          <CardDescription>Last portal snapshot fields parsed from your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <SkeletonText lines={10} /> : data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.photoUrl && <img src={data.photoUrl} alt="Student" className="h-28 w-28 rounded-lg object-cover border border-border" />}
              {rows.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm font-semibold break-words">{value || "Not available"}</p>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No profile data" description="Connect or refresh the portal to load profile details." icon="users" />}
        </CardContent>
      </Card>
    </div>
  );
}
