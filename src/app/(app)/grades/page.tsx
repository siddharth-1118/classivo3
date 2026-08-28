"use client";

import * as React from "react";
import { Download, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SkeletonText } from "@/components/ui/Skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { usePortalClient } from "@/lib/hooks/use-portal-client";
import type { GradesData } from "@/lib/types/portal";

export default function GradesPage() {
  const { getGrades, exportGrades } = usePortalClient();
  const [data, setData] = React.useState<GradesData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [semester, setSemester] = React.useState("all");

  React.useEffect(() => {
    getGrades().then(setData).finally(() => setLoading(false));
  }, [getGrades]);

  const rows = React.useMemo(() => {
    return (data?.grades ?? []).filter((g) => {
      const matchesSemester = semester === "all" || String(g.semester) === semester;
      const q = query.toLowerCase();
      const matchesQuery = !q || `${g.code} ${g.title} ${g.grade}`.toLowerCase().includes(q);
      return matchesSemester && matchesQuery;
    });
  }, [data, query, semester]);

  const semesters = Array.from(new Set((data?.grades ?? []).map((g) => g.semester))).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Grades</h1>
          <p className="mt-1.5 text-muted-foreground">Marks, credits, SGPA and CGPA from the latest snapshot.</p>
        </div>
        <Button variant="outline" onClick={exportGrades} leftIcon={<Download className="h-4 w-4" />}>CSV</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          ["CGPA", data?.summary.cgpa?.toFixed(2)],
          ["Credits Earned", data?.summary.creditsEarned],
          ["Credits Registered", data?.summary.creditsRegistered],
        ].map(([label, value]) => (
          <Card key={label}><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground font-semibold">{label}</p><p className="mt-2 text-2xl font-bold">{value ?? "-"}</p></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Subject Rows</CardTitle>
          <CardDescription>{rows.length} records shown</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-3">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search course or grade" leftIcon={<Search className="h-4 w-4" />} />
            <Select value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="all">All semesters</option>
              {semesters.map((s) => <option key={s} value={s}>Semester {s}</option>)}
            </Select>
          </div>
          {loading ? <SkeletonText lines={8} /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Sem</TableHead><TableHead>Month / Year</TableHead><TableHead>Code</TableHead><TableHead>Subject</TableHead><TableHead>Credit</TableHead><TableHead>Grade</TableHead></TableRow></TableHeader>
              <TableBody>{rows.map((g, i) => <TableRow key={`${g.code}-${i}`}><TableCell>{g.semester}</TableCell><TableCell>{g.examMonthYear}</TableCell><TableCell>{g.code}</TableCell><TableCell>{g.title}</TableCell><TableCell>{g.credit}</TableCell><TableCell className="font-semibold">{g.grade}</TableCell></TableRow>)}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
