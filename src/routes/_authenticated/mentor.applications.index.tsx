import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { AppShell, EmptyState } from "@/components/AppShell";
import { STATUS_LABEL, formatDate } from "@/lib/domain";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/mentor/applications/")({
  component: AssignedApplications,
});

function AssignedApplications() {
  const { data: me } = useMe();
  const mentorId = me?.user?.id;

  const { data: rows, isLoading } = useQuery({
    queryKey: ["mentor-progress", mentorId],
    enabled: !!mentorId,
    queryFn: async () => {
      const { data: progress, error } = await supabase
        .from("application_progress")
        .select("*")
        .eq("selected_mentor_id", mentorId!);
      if (error) throw error;

      const ids = (progress ?? []).map((p) => p.application_id as string);
      if (ids.length === 0) return [];

      const { data: details } = await supabase
        .from("applications")
        .select("id, student:student_id(name), listings(title, institutions(name))")
        .in("id", ids);

      const detailMap = new Map((details ?? []).map((d) => [d.id, d]));
      return (progress ?? []).map((p) => ({
        ...p,
        detail: detailMap.get(p.application_id as string),
      }));
    },
  });

  return (
    <AppShell
      title="Assigned students"
      description="Overdue means no follow-up logged in the last 10 days."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows?.length === 0 ? (
        <EmptyState title="Nothing assigned yet" />
      ) : (
        <div className="paper-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Last follow-up</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows?.map((row) => {
                const detail = row.detail as
                  | {
                      student: { name: string } | null;
                      listings: { title: string; institutions: { name: string } | null } | null;
                    }
                  | undefined;
                return (
                  <TableRow key={row.application_id as string}>
                    <TableCell className="font-medium">{detail?.student?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {detail?.listings?.title}
                      <span className="block text-xs">{detail?.listings?.institutions?.name}</span>
                    </TableCell>
                    <TableCell>{STATUS_LABEL[row.status as string] ?? row.status}</TableCell>
                    <TableCell>
                      <span className="text-sm">{formatDate(row.last_follow_up_at as string)}</span>
                      {row.overdue ? (
                        <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                          Overdue
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to="/mentor/applications/$id"
                        params={{ id: row.application_id as string }}
                        className="text-sm text-accent underline underline-offset-4"
                      >
                        Review
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}
