"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { SkeletonText } from "@/components/ui/Skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { usePortalClient } from "@/lib/hooks/use-portal-client";
import type { ExamTimetableData } from "@/lib/types/portal";

export default function ExamsPage() {
  const { getExams } = usePortalClient();
  const [data, setData] = React.useState<ExamTimetableData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("upcoming");

  React.useEffect(() => { getExams().then(setData).finally(() => setLoading(false)); }, [getExams]);

  const rows = (data?.timetable ?? []).filter((exam) => {
    if (filter === "all") return true;
    const date = new Date(exam.examDate);
    return !Number.isNaN(date.getTime()) && date >= new Date(new Date().toDateString());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Exam Timetable</h1>
          <p className="mt-1.5 text-muted-foreground">Upcoming and synced exam schedule details.</p>
        </div>
        <Select className="sm:w-44" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="upcoming">Upcoming</option>
          <option value="all">All exams</option>
        </Select>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div><CardTitle>{data?.examinationName ?? "Timetable"}</CardTitle><CardDescription>Last updated: {data?.lastUpdated ?? "Not available"}</CardDescription></div>
            <Badge variant="outline"><CalendarDays className="h-3 w-3" /> {rows.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <SkeletonText lines={8} /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Date</TableHead><TableHead>Session</TableHead><TableHead>Venue</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader>
              <TableBody>{rows.map((e, i) => <TableRow key={`${e.courseCode}-${i}`}><TableCell><p className="font-medium">{e.courseName}</p><p className="text-xs text-muted-foreground">{e.courseCode}</p></TableCell><TableCell>{e.examDate}</TableCell><TableCell>{e.session}</TableCell><TableCell>{e.venue}</TableCell><TableCell>{e.remarks ?? "-"}</TableCell></TableRow>)}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
