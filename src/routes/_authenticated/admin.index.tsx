import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { AppShell, EmptyState, StatCard } from "@/components/AppShell";
import { formatDate } from "@/lib/domain";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading } = useMe();
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <AppShell title="Admin">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (!me?.isAdmin) {
    const claim = async () => {
      setBusy(true);
      const { data, error } = await supabase.rpc("claim_admin");
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (data) {
        toast.success("You're now an administrator.");
        queryClient.invalidateQueries({ queryKey: ["me"] });
      } else {
        toast.error("An administrator already exists for this platform.");
      }
    };

    return (
      <AppShell title="Admin area" description="This area is restricted to administrators.">
        <div className="paper-card max-w-xl p-6">
          <p className="font-display text-base">You don't have admin access</p>
          <p className="mt-1 text-sm text-muted-foreground">
            If no administrator exists yet, you can claim the role once to set the platform up.
          </p>
          <Button className="mt-4" onClick={claim} disabled={busy}>
            Claim admin access
          </Button>
        </div>
      </AppShell>
    );
  }

  return <>{children}</>;
}

function AdminDashboard() {
  return (
    <AdminGate>
      <AdminBody />
    </AdminGate>
  );
}

function AdminBody() {
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [students, listings, applications, completed] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("applications").select("id", { count: "exact", head: true }),
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed"),
      ]);
      return {
        students: students.count ?? 0,
        listings: listings.count ?? 0,
        applications: applications.count ?? 0,
        completed: completed.count ?? 0,
      };
    },
  });

  const { data: pendingInstitutions } = useQuery({
    queryKey: ["pending-institutions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("institutions")
        .select("id, name, type, website, created_at")
        .eq("verification_status", "pending")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: escalations } = useQuery({
    queryKey: ["open-escalations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("escalations")
        .select("id, reason, details, created_at, application_id")
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const verify = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("institutions")
      .update({ verification_status: status })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "approved" ? "Organisation approved." : "Organisation rejected.");
    queryClient.invalidateQueries({ queryKey: ["pending-institutions"] });
  };

  return (
    <AppShell
      title="Platform overview"
      description="Verification requests, activity and open disputes."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={stats?.students ?? 0} />
        <StatCard label="Open listings" value={stats?.listings ?? 0} />
        <StatCard label="Applications" value={stats?.applications ?? 0} />
        <StatCard label="Completed placements" value={stats?.completed ?? 0} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="section-title text-lg">Verification requests</h2>
          {pendingInstitutions?.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="Nothing waiting" />
            </div>
          ) : (
            <div className="paper-card mt-3 divide-y divide-border">
              {pendingInstitutions?.map((institution) => (
                <div key={institution.id} className="p-5">
                  <p className="font-display text-base">{institution.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {institution.type ?? "Organisation"} · requested {formatDate(institution.created_at)}
                  </p>
                  {institution.website ? (
                    <a
                      href={institution.website}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-accent underline underline-offset-4"
                    >
                      {institution.website}
                    </a>
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => verify(institution.id, "approved")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => verify(institution.id, "rejected")}>
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h2 className="section-title text-lg">Open escalations</h2>
            <Link to="/admin/escalations" className="text-sm text-accent underline underline-offset-4">
              See all
            </Link>
          </div>
          {escalations?.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="No open escalations" />
            </div>
          ) : (
            <div className="paper-card mt-3 divide-y divide-border">
              {escalations?.map((escalation) => (
                <div key={escalation.id} className="p-5">
                  <p className="font-medium">{escalation.reason}</p>
                  <p className="text-sm text-muted-foreground">{escalation.details}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Raised {formatDate(escalation.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
