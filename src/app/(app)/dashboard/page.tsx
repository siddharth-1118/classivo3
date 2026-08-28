"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusChip } from "@/components/ui/StatusChip";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { usePortalClient } from "@/lib/hooks/use-portal-client";
import { useToast } from "@/components/ui/Toast";
import {
  GraduationCap,
  BookOpen,
  Building2,
  CalendarCheck,
  TrendingUp,
  Award,
  Clock,
  RefreshCw,
  Home,
  Mail,
  User,
  Building,
  Users,
} from "lucide-react";
import type { DashboardData } from "@/lib/types/portal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "Unknown";
  }
}

export default function DashboardPage() {
  const { getDashboard, studentName, refreshAll } = usePortalClient();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [lastSynced, setLastSynced] = React.useState<string | null>(null);
  const [, forceUpdate] = React.useState(0);

  const fetchDashboard = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getDashboard();
      setData(d);
      if (d?.lastSynced) {
        setLastSynced(d.lastSynced);
        try {
          localStorage.setItem("student_portal_last_sync", d.lastSynced);
        } catch {}
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load dashboard";
      setError(msg);
      toast({
        title: "Could not load dashboard",
        description: msg,
        variant: "warning",
      });
    } finally {
      setLoading(false);
    }
  }, [getDashboard, toast]);

  React.useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  React.useEffect(() => {
    const interval = setInterval(() => forceUpdate((x) => x + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      const results = await refreshAll();
      if (results.dashboard) {
        setData(results.dashboard);
        if (results.dashboard.lastSynced) {
          setLastSynced(results.dashboard.lastSynced);
          try {
            localStorage.setItem("student_portal_last_sync", results.dashboard.lastSynced);
          } catch {}
        }
      }
      toast({
        title: "Refreshed",
        description: "All your data has been updated.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Refresh failed",
        description: "Could not refresh data. Please try again.",
        variant: "error",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const displayName = data?.studentName || studentName || "Student";
  const firstName = displayName.split(" ")[0];

  const statCards = [
    {
      label: "CGPA",
      value: data?.cgpa ? data.cgpa.toFixed(2) : "—",
      icon: <Award className="h-5 w-5" />,
      accent: "text-success-600",
      bg: "bg-success-500/10",
    },
    {
      label: "Latest SGPA",
      value: data?.latestSgpa ? data.latestSgpa.toFixed(2) : "—",
      icon: <TrendingUp className="h-5 w-5" />,
      accent: "text-brand-600",
      bg: "bg-brand-500/10",
    },
    {
      label: "Credits",
      value: data
        ? `${data.creditsEarned} / ${data.creditsRegistered}`
        : "—",
      icon: <BookOpen className="h-5 w-5" />,
      accent: "text-warning-600",
      bg: "bg-warning-500/10",
    },
    {
      label: "Semester",
      value: data?.semester ? `Sem ${data.semester}` : "—",
      icon: <CalendarCheck className="h-5 w-5" />,
      accent: "text-info-600",
      bg: "bg-info-500/10",
    },
  ];

  if (error && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Good day, {firstName} 👋
            </h1>
            <p className="mt-1.5 text-muted-foreground">
              Here's what's happening with your academics today.
            </p>
          </div>
        </div>
        <ErrorState
          title="Failed to load dashboard"
          description={error}
          variant="error"
          retry={{
            label: "Retry",
            onClick: fetchDashboard,
            loading: loading,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Good day, {firstName} 👋
          </h1>
          <div className="mt-1.5 flex items-center gap-3 flex-wrap">
            <p className="text-muted-foreground">
              Here's what's happening with your academics today.
            </p>
            {lastSynced && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Last synced: {formatRelativeTime(lastSynced)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            loading={refreshing}
            leftIcon={!refreshing && <RefreshCw className="h-4 w-4" />}
          >
            Refresh All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {s.label}
                  </p>
                  <div className="mt-2 text-2xl font-bold tracking-tight">
                    {loading ? (
                      <Skeleton className="inline-block w-16 h-7" />
                    ) : (
                      s.value
                    )}
                  </div>
                </div>
                <div
                  className={cn(
                    `p-2.5 rounded-xl ${s.bg} ${s.accent} dark:opacity-90`
                  )}
                >
                  {s.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Student Information</CardTitle>
                <CardDescription>Your academic profile details.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4 py-2">
                <SkeletonText lines={6} />
              </div>
            ) : data ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={<Building className="h-4 w-4" />} label="Institution" value={data.institution} />
                <InfoRow icon={<GraduationCap className="h-4 w-4" />} label="Program" value={data.program} />
                <InfoRow icon={<CalendarCheck className="h-4 w-4" />} label="Batch" value={data.batch} />
                <InfoRow icon={<Users className="h-4 w-4" />} label="Section" value={data.section} />
                <InfoRow icon={<User className="h-4 w-4" />} label="Student ID" value={data.studentId} />
                <InfoRow icon={<BookOpen className="h-4 w-4" />} label="Register No" value={data.registerNumber} />
                <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={data.email} />
                {data.roomNo && (
                  <InfoRow icon={<Home className="h-4 w-4" />} label="Room No" value={data.roomNo} />
                )}
                {data.facultyAdvisor && (
                  <InfoRow icon={<User className="h-4 w-4" />} label="Faculty Advisor" value={data.facultyAdvisor} />
                )}
                {data.academicAdvisor && (
                  <InfoRow icon={<User className="h-4 w-4" />} label="Academic Advisor" value={data.academicAdvisor} />
                )}
                <div className="sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Current Status:</span>
                    <StatusChip status="success" label={data.currentStatus} />
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No student info"
                description="Student information will appear here once loaded."
                icon="users"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Hostel Summary</CardTitle>
            <CardDescription>Your hostel accommodation status.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4 py-2">
                <SkeletonText lines={4} />
              </div>
            ) : data?.hostelStatus || data?.hostelRoomDetails ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/40">
                  <div className="h-10 w-10 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {data.hostelStatus === "Hosteller" ? "Hosteller" : data.hostelStatus || "Dayscholar"}
                    </p>
                    <StatusChip
                      status={data.hostelStatus === "Hosteller" ? "success" : "info"}
                      showDot={false}
                      label={data.hostelStatus || "Not in hostel"}
                    />
                  </div>
                </div>
                {data.hostelStatus === "Hosteller" && data.hostelRoomDetails && (
                  <dl className="space-y-3 text-sm">
                    {data.hostelRoomDetails.hostelName && (
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Hostel</dt>
                        <dd className="font-medium truncate max-w-[60%]">
                          {data.hostelRoomDetails.hostelName}
                        </dd>
                      </div>
                    )}
                    {data.hostelRoomDetails.roomNo && (
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Room No</dt>
                        <dd className="font-medium">{data.hostelRoomDetails.roomNo}</dd>
                      </div>
                    )}
                    {data.hostelRoomDetails.block && (
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Block</dt>
                        <dd className="font-medium">{data.hostelRoomDetails.block}</dd>
                      </div>
                    )}
                    {data.hostelRoomDetails.floor && (
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Floor</dt>
                        <dd className="font-medium">{data.hostelRoomDetails.floor}</dd>
                      </div>
                    )}
                    {data.hostelRoomDetails.bedNo && (
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Bed No</dt>
                        <dd className="font-medium">{data.hostelRoomDetails.bedNo}</dd>
                      </div>
                    )}
                  </dl>
                )}
                {(!data.hostelRoomDetails || Object.keys(data.hostelRoomDetails).length === 0) && data.hostelStatus === "Hosteller" && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No room details available yet.
                  </p>
                )}
                {data.hostelStatus !== "Hosteller" && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    You are currently registered as a {data.hostelStatus || "Dayscholar"}.
                  </p>
                )}
              </div>
            ) : (
              <EmptyState
                title="No hostel info"
                description="Hostel information will appear here once loaded."
                icon="inbox"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Exams</CardTitle>
                <CardDescription>Your scheduled examinations.</CardDescription>
              </div>
              <Badge variant="outline">
                {data?.upcomingExams?.length || 0} exams
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4 py-2">
                <SkeletonText lines={5} />
              </div>
            ) : data?.upcomingExams?.length ? (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="px-2 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Session
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Days
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.upcomingExams.slice(0, 5).map((exam, i) => (
                      <tr key={i} className="border-b border-border/60 last:border-0">
                        <td className="px-2 py-3">
                          <p className="font-medium text-sm truncate max-w-[240px]">
                            {exam.courseName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {exam.courseCode}
                          </p>
                        </td>
                        <td className="px-2 py-3 text-sm">
                          {new Date(exam.examDate).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-2 py-3 text-sm">
                          <Badge variant="outline" size="sm">
                            {exam.session || "—"}
                          </Badge>
                        </td>
                        <td className="px-2 py-3">
                          {exam.daysUntil <= 0 ? (
                            <Badge variant="brand" size="sm">
                              Today
                            </Badge>
                          ) : exam.daysUntil === 1 ? (
                            <Badge variant="warning" size="sm">
                              Tomorrow
                            </Badge>
                          ) : exam.daysUntil <= 7 ? (
                            <Badge variant="warning" size="sm">
                              {exam.daysUntil}d
                            </Badge>
                          ) : (
                            <Badge variant="info" size="sm">
                              {exam.daysUntil}d
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No upcoming exams"
                description="Your exam schedule will appear here once available."
                icon="calendar"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Notices</CardTitle>
                <CardDescription>Updates and announcements.</CardDescription>
              </div>
              <Badge variant="outline">{data?.notices?.length || 0}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4 py-2">
                <SkeletonText lines={4} />
              </div>
            ) : data?.notices?.length ? (
              <ul className="divide-y divide-border/60 -mx-2">
                {data.notices.slice(0, 5).map((n) => (
                  <li
                    key={n.id}
                    className="flex items-start gap-3 px-2 py-3 hover:bg-muted/30 rounded-lg transition-colors"
                  >
                    <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug line-clamp-2">
                        {n.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">
                          {n.date}
                        </span>
                        {n.category && (
                          <StatusChip
                            status="info"
                            showDot={false}
                            label={n.category}
                          />
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No notices yet"
                description="Portal notices will appear here once loaded."
                icon="inbox"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-medium truncate">{value || "—"}</p>
      </div>
    </div>
  );
}
