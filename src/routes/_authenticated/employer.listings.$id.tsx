import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, EmptyState } from "@/components/AppShell";
import { STATUS_LABEL, STATUS_TONE, formatDate } from "@/lib/domain";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/employer/listings/$id")({
  component: ListingApplicants,
});

function ListingApplicants() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const { data: listing } = useQuery({
    queryKey: ["employer-listing", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("title, category, status")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  const { data: applications, isLoading } = useQuery({
    queryKey: ["listing-applications", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, student:student_id(name, course, institution_name)")
        .eq("listing_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const decide = async (applicationId: string, status: "approved" | "rejected", studentId: string) => {
    setBusy(true);
    const { error } = await supabase.from("applications").update({ status }).eq("id", applicationId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("notifications").insert({
      user_id: studentId,
      message:
        status === "approved"
          ? "Your application was approved."
          : "Your application wasn't taken forward this time.",
      link: `/app/applications/${applicationId}`,
    });
    queryClient.invalidateQueries({ queryKey: ["listing-applications", id] });
    toast.success(status === "approved" ? "Applicant approved." : "Applicant rejected.");
  };

  return (
    <AppShell title={listing?.title ?? "Applicants"} description={listing?.category ?? undefined}>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : applications?.length === 0 ? (
        <EmptyState title="No applicants yet" />
      ) : (
        <div className="space-y-4">
          {applications?.map((application) => {
            const student = application.student as
              | { name: string; course: string | null; institution_name: string | null }
              | null;
            return (
              <div key={application.id} className="paper-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-base">{student?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {student?.course}
                      {student?.institution_name ? ` · ${student.institution_name}` : ""} · applied{" "}
                      {formatDate(application.created_at)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_TONE[application.status] ?? "bg-muted"}`}
                  >
                    {STATUS_LABEL[application.status] ?? application.status}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(open === application.id ? null : application.id)}
                  className="mt-3 text-sm text-accent underline underline-offset-4"
                >
                  {open === application.id ? "Hide application" : "Read full application"}
                </button>
                {open === application.id ? (
                  <p className="mt-2 whitespace-pre-line rounded-lg bg-secondary p-4 text-sm">
                    {application.motivation}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {application.status === "pending" || application.status === "mentor_selected" ? (
                    <>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => decide(application.id, "approved", application.student_id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => decide(application.id, "rejected", application.student_id)}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                  {["approved", "in_progress", "completed"].includes(application.status) ? (
                    <>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/employer/applications/$id" params={{ id: application.id }}>
                          Project brief & sign-off
                        </Link>
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
