import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { AppShell, EmptyState, StatCard } from "@/components/AppShell";
import { STATUS_LABEL, STATUS_TONE, formatDate } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/mentor/")({
  component: MentorDashboard,
});

function MentorDashboard() {
  const { data: me } = useMe();
  const mentorId = me?.user?.id;

  const { data: rows, isLoading } = useQuery({
    queryKey: ["mentor-applications", mentorId],
    enabled: !!mentorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(
          "id, status, created_at, mentor_approved, employer_approved, student:student_id(name), listings(title, institutions(name))",
        )
        .eq("selected_mentor_id", mentorId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pending } = useQuery({
    queryKey: ["mentor-pending-reviews", mentorId],
    enabled: !!mentorId,
    queryFn: async () => {
      const { data } = await supabase
        .from("follow_ups")
        .select("id, applications!inner(selected_mentor_id)")
        .eq("status", "submitted")
        .eq("applications.selected_mentor_id", mentorId!);
      return data?.length ?? 0;
    },
  });

  const active = (rows ?? []).filter((r) =>
    ["mentor_selected", "approved", "in_progress"].includes(r.status),
  ).length;
  const completedThisMonth = (rows ?? []).filter(
    (r) => r.status === "completed" && new Date(r.created_at).getMonth() === new Date().getMonth(),
  ).length;

  return (
    <AppShell title="Mentor dashboard" description="Your current student load at a glance.">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active students" value={active} />
        <StatCard label="Follow-ups to review" value={pending ?? 0} />
        <StatCard label="Completions this month" value={completedThisMonth} />
      </div>

      <h2 className="section-title mt-8 text-lg">Your students</h2>
      {isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      ) : rows?.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="No students yet"
            hint="Students choose mentors from the admin-curated pool for their category."
          />
        </div>
      ) : (
        <div className="paper-card mt-3 divide-y divide-border">
          {rows?.map((row) => {
            const listing = row.listings as { title: string; institutions: { name: string } | null } | null;
            return (
              <Link
                key={row.id}
                to="/mentor/applications/$id"
                params={{ id: row.id }}
                className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-secondary/60"
              >
                <div>
                  <p className="font-display text-base">
                    {(row.student as { name: string } | null)?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {listing?.title} · {listing?.institutions?.name} · since {formatDate(row.created_at)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_TONE[row.status] ?? "bg-muted"}`}
                >
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
