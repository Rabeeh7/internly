import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { AppShell, EmptyState } from "@/components/AppShell";
import { STATUS_LABEL, STATUS_TONE, formatDate } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/app/applications/")({
  component: MyApplications,
});

function MyApplications() {
  const { data: me } = useMe();
  const studentId = me?.user?.id;

  const { data: applications, isLoading } = useQuery({
    queryKey: ["my-applications", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(
          "id, status, created_at, mentor_approved, employer_approved, listings(title, category, institutions(name))",
        )
        .eq("student_id", studentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppShell title="My applications" description="Every application you've sent and where it stands.">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : applications?.length === 0 ? (
        <EmptyState
          title="No applications yet"
          hint="Browse your dashboard and apply to something that matches."
        />
      ) : (
        <div className="paper-card divide-y divide-border">
          {applications?.map((application) => {
            const listing = application.listings as {
              title: string;
              category: string;
              institutions: { name: string } | null;
            } | null;
            return (
              <Link
                key={application.id}
                to="/app/applications/$id"
                params={{ id: application.id }}
                className="flex flex-wrap items-center justify-between gap-3 p-5 transition-colors hover:bg-secondary/60"
              >
                <div>
                  <p className="font-display text-base">{listing?.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {listing?.institutions?.name} · applied {formatDate(application.created_at)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_TONE[application.status] ?? "bg-muted"}`}
                >
                  {STATUS_LABEL[application.status] ?? application.status}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
