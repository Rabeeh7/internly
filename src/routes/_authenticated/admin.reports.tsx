import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, StatCard } from "@/components/AppShell";
import { AdminGate } from "./admin.index";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: () => (
    <AdminGate>
      <Reports />
    </AdminGate>
  ),
});

function Reports() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const [{ data: applications }, { data: mentors }, { data: ratings }] = await Promise.all([
        supabase
          .from("applications")
          .select("id, status, selected_mentor_id, listings(category)"),
        supabase.from("profiles").select("id, name, max_load").eq("role", "mentor"),
        supabase.from("ratings").select("to_user, stars, to_role"),
      ]);

      const rows = applications ?? [];
      const funnel = [
        { label: "Applied", value: rows.length },
        { label: "Mentor selected", value: rows.filter((r) => !!r.selected_mentor_id).length },
        {
          label: "Approved",
          value: rows.filter((r) => ["approved", "in_progress", "completed"].includes(r.status)).length,
        },
        { label: "Completed", value: rows.filter((r) => r.status === "completed").length },
      ];

      const byCategory: Record<string, { applications: number; completed: number }> = {};
      rows.forEach((row) => {
        const category = (row.listings as { category: string } | null)?.category ?? "Uncategorised";
        byCategory[category] ??= { applications: 0, completed: 0 };
        byCategory[category].applications += 1;
        if (row.status === "completed") byCategory[category].completed += 1;
      });

      const mentorRows = (mentors ?? []).map((mentor) => {
        const assigned = rows.filter((r) => r.selected_mentor_id === mentor.id);
        const mentorRatings = (ratings ?? []).filter(
          (r) => r.to_user === mentor.id && r.to_role === "mentor",
        );
        const average = mentorRatings.length
          ? mentorRatings.reduce((sum, r) => sum + (r.stars ?? 0), 0) / mentorRatings.length
          : null;
        return {
          id: mentor.id,
          name: mentor.name as string,
          assigned: assigned.length,
          completed: assigned.filter((r) => r.status === "completed").length,
          average,
          capacity: mentor.max_load ?? 5,
        };
      });

      return { funnel, byCategory, mentorRows };
    },
  });

  const max = Math.max(1, ...(data?.funnel ?? []).map((step) => step.value));

  return (
    <AppShell title="Reports" description="Where students drop off, and who keeps them moving.">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data?.funnel.map((step) => (
              <StatCard key={step.label} label={step.label} value={step.value} />
            ))}
          </div>

          <h2 className="section-title mt-8 text-lg">Conversion funnel</h2>
          <div className="paper-card mt-3 space-y-4 p-6">
            {data?.funnel.map((step) => (
              <div key={step.label}>
                <div className="flex justify-between text-sm">
                  <span>{step.label}</span>
                  <span className="text-muted-foreground">{step.value}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(step.value / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <h2 className="section-title mt-8 text-lg">Placements by category</h2>
          <div className="paper-card mt-3 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data?.byCategory ?? {}).map(([category, value]) => (
                  <TableRow key={category}>
                    <TableCell className="font-medium">{category}</TableCell>
                    <TableCell>{value.applications}</TableCell>
                    <TableCell>{value.completed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <h2 className="section-title mt-8 text-lg">Mentor performance</h2>
          <div className="paper-card mt-3 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Avg rating</TableHead>
                  <TableHead>Capacity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.mentorRows.map((mentor) => (
                  <TableRow key={mentor.id}>
                    <TableCell className="font-medium">{mentor.name}</TableCell>
                    <TableCell>{mentor.assigned}</TableCell>
                    <TableCell>{mentor.completed}</TableCell>
                    <TableCell>{mentor.average ? mentor.average.toFixed(1) : "—"}</TableCell>
                    <TableCell>{mentor.capacity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </AppShell>
  );
}
