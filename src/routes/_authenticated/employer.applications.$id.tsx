import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { AppShell, EmptyState } from "@/components/AppShell";
import { STATUS_LABEL, formatDate } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/employer/applications/$id")({
  component: EmployerApplication,
});

function EmployerApplication() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: application, isLoading } = useQuery({
    queryKey: ["employer-application", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("*, student:student_id(name, course), listings(title)")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  const { data: briefs } = useQuery({
    queryKey: ["project-briefs", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("project_briefs")
        .select("*")
        .eq("application_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const assign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application) return;
    setBusy(true);
    const { error } = await supabase.from("project_briefs").insert({
      application_id: id,
      title,
      scope: brief,
      deliverables,
      start_date: dueDate || null,
    });
    if (!error && application.status === "approved") {
      await supabase.from("applications").update({ status: "in_progress" }).eq("id", id);
    }
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const recipients = [application.student_id, application.selected_mentor_id].filter(
      Boolean,
    ) as string[];
    if (recipients.length) {
      await supabase.from("notifications").insert(
        recipients.map((user_id) => ({
          user_id,
          message: `New project assigned: ${title}`,
          link: `/app/applications/${id}`,
        })),
      );
    }
    setTitle("");
    setBrief("");
    setDeliverables("");
    setDueDate("");
    toast.success("Project assigned and both parties notified.");
    queryClient.invalidateQueries({ queryKey: ["project-briefs", id] });
    queryClient.invalidateQueries({ queryKey: ["employer-application", id] });
  };

  const signOff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me?.user?.id || !application) return;
    setBusy(true);
    const { error: ratingError } = await supabase.from("ratings").insert({
      application_id: id,
      from_user: me.user.id,
      to_user: application.student_id,
      from_role: "employer",
      to_role: "student",
      stars,
      comment: comment || null,
    });
    if (ratingError) {
      setBusy(false);
      toast.error(ratingError.message);
      return;
    }
    const { error } = await supabase
      .from("applications")
      .update({ employer_approved: true })
      .eq("id", id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("notifications").insert({
      user_id: application.student_id,
      message: "Your host organisation approved your completion.",
      link: `/app/applications/${id}`,
    });
    toast.success("Completion approved.");
    queryClient.invalidateQueries({ queryKey: ["employer-application", id] });
  };

  if (isLoading) {
    return (
      <AppShell title="Placement">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }
  if (!application) {
    return (
      <AppShell title="Placement">
        <EmptyState title="Application not found" />
      </AppShell>
    );
  }

  const student = application.student as { name: string; course: string | null } | null;
  const listing = application.listings as { title: string } | null;

  return (
    <AppShell
      title={student?.name ?? "Student"}
      description={`${listing?.title ?? ""} · ${STATUS_LABEL[application.status] ?? application.status}`}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <form onSubmit={assign} className="paper-card space-y-4 p-6">
            <h2 className="section-title text-lg">Assign a project</h2>
            <div>
              <Label htmlFor="title">Project title</Label>
              <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="brief">Brief</Label>
              <Textarea
                id="brief"
                rows={4}
                required
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="deliverables">Deliverables</Label>
              <Textarea
                id="deliverables"
                rows={3}
                value={deliverables}
                onChange={(e) => setDeliverables(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="due">Start date</Label>
              <Input
                id="due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy}>
              Assign project
            </Button>
          </form>

          <div className="paper-card p-6">
            <h2 className="section-title text-lg">Assigned projects</h2>
            {briefs?.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No projects assigned yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {briefs?.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border p-4">
                    <p className="font-display text-base">{item.title}</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                      {item.scope}
                    </p>
                    {item.deliverables ? (
                      <p className="mt-2 text-sm">
                        <span className="font-medium">Deliverables: </span>
                        {item.deliverables}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Starts {formatDate(item.start_date)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="paper-card h-fit p-6">
          <h2 className="section-title text-lg">Approve completion</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The certificate is issued once both you and the mentor sign off.
          </p>
          <ul className="mt-4 space-y-1 text-sm">
            <li>Mentor sign-off: {application.mentor_approved ? "done" : "waiting"}</li>
            <li>Your sign-off: {application.employer_approved ? "done" : "waiting"}</li>
          </ul>
          {application.employer_approved ? (
            <p className="mt-4 text-sm text-success">You've approved this completion.</p>
          ) : (
            <form onSubmit={signOff} className="mt-4 space-y-3">
              <div>
                <Label>Rate the student</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      aria-label={`${star} stars`}
                      onClick={() => setStars(star)}
                      className={`text-2xl leading-none ${star <= stars ? "text-accent" : "text-border"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                rows={3}
                placeholder="Feedback for the record"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button type="submit" disabled={busy}>
                Approve completion
              </Button>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}
