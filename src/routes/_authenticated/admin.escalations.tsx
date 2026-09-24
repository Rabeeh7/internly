import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, EmptyState } from "@/components/AppShell";
import { AdminGate } from "./admin.index";
import { formatDate } from "@/lib/domain";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/escalations")({
  component: () => (
    <AdminGate>
      <Escalations />
    </AdminGate>
  ),
});

function Escalations() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: escalations, isLoading } = useQuery({
    queryKey: ["escalations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escalations")
        .select("*")
        .order("resolved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const scan = async () => {
    setBusy(true);
    const { data: overdue } = await supabase
      .from("application_progress")
      .select("application_id, student_id, last_follow_up_at")
      .eq("overdue", true);

    const { data: existing } = await supabase
      .from("escalations")
      .select("application_id")
      .eq("reason", "Overdue follow-up")
      .eq("resolved", false);
    const known = new Set((existing ?? []).map((row) => row.application_id));

    const rows = (overdue ?? [])
      .filter((row) => !known.has(row.application_id as string))
      .map((row) => ({
        application_id: row.application_id as string,
        reason: "Overdue follow-up",
        details: "No follow-up logged in the last 10 days.",
      }));

    if (rows.length) {
      const { error } = await supabase.from("escalations").insert(rows);
      if (error) {
        setBusy(false);
        toast.error(error.message);
        return;
      }
    }
    setBusy(false);
    toast.success(rows.length ? `${rows.length} new escalation(s) raised.` : "Nothing new to flag.");
    queryClient.invalidateQueries({ queryKey: ["escalations"] });
  };

  const resolve = async (id: string, resolved: boolean) => {
    const { error } = await supabase.from("escalations").update({ resolved }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["escalations"] });
    queryClient.invalidateQueries({ queryKey: ["open-escalations"] });
  };

  return (
    <AppShell
      title="Escalations"
      description="Stalled placements and disputes that need a human decision."
      actions={
        <Button size="sm" onClick={scan} disabled={busy}>
          {busy ? "Scanning…" : "Scan for stalled placements"}
        </Button>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : escalations?.length === 0 ? (
        <EmptyState title="Nothing escalated" hint="Run a scan to flag placements with no recent activity." />
      ) : (
        <div className="space-y-3">
          {escalations?.map((escalation) => (
            <div key={escalation.id} className="paper-card flex flex-wrap items-start justify-between gap-3 p-5">
              <div>
                <p className="font-display text-base">{escalation.reason}</p>
                <p className="text-sm text-muted-foreground">{escalation.details}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Raised {formatDate(escalation.created_at)}
                  {escalation.involved ? ` · ${escalation.involved}` : ""}
                </p>
              </div>
              {escalation.resolved ? (
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
                    Resolved
                  </span>
                  <Button size="sm" variant="outline" onClick={() => resolve(escalation.id, false)}>
                    Reopen
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={() => resolve(escalation.id, true)}>
                  Mark resolved
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
