import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { AppShell, EmptyState } from "@/components/AppShell";
import { formatDate } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/mentor/applications/$id")({
  component: MentorReview,
});

function MentorReview() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: application, isLoading } = useQuery({
    queryKey: ["mentor-application", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("*, student:student_id(name, course, institution_name), listings(title, institutions(name))")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  const { data: followUps } = useQuery({
    queryKey: ["follow-ups", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("follow_ups")
        .select("*")
        .eq("application_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const review = async (followUpId: string, status: "approved" | "changes_requested", note?: string) => {
    setBusy(true);
    const { error } = await supabase
      .from("follow_ups")
      .update({ status, mentor_note: note ?? null })
      .eq("id", followUpId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["follow-ups", id] });
  };

  const signOff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me?.user?.id || !application) return;
    setBusy(true);
    const { error: ratingError } = await supabase.from("ratings").insert({
      application_id: id,
      from_user: me.user.id,
      to_user: application.student_id,
      from_role: "mentor",
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
      .update({ mentor_approved: true })
      .eq("id", id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("notifications").insert({
      user_id: application.student_id,
      message: "Your mentor signed off on your placement.",
      link: `/app/applications/${id}`,
    });
    toast.success("Signed off.");
    queryClient.invalidateQueries({ queryKey: ["mentor-application", id] });
  };

  if (isLoading) {
    return (
      <AppShell title="Review">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }
  if (!application) {
    return (
      <AppShell title="Review">
        <EmptyState title="Application not found" />
      </AppShell>
    );
  }

  const student = application.student as
    | { name: string; course: string | null; institution_name: string | null }
    | null;
  const listing = application.listings as { title: string; institutions: { name: string } | null } | null;

  return (
    <AppShell
      title={student?.name ?? "Student"}
      description={`${listing?.title ?? ""} · ${listing?.institutions?.name ?? ""}`}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="paper-card p-6">
          <h2 className="section-title text-lg">Follow-up timeline</h2>
          {followUps?.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nothing submitted yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {followUps?.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</p>
                  <p className="mt-2 text-sm">{entry.content}</p>
                  {entry.link_url ? (
                    <a
                      href={entry.link_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs text-accent underline underline-offset-4"
                    >
                      Attached link
                    </a>
                  ) : null}
                  {entry.status === "submitted" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" disabled={busy} onClick={() => review(entry.id, "approved")}>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          const note = window.prompt("What should the student change?");
                          if (note) review(entry.id, "changes_requested", note);
                        }}
                      >
                        Request changes
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs font-medium text-muted-foreground">
                      {entry.status === "approved" ? "You approved this entry." : "Changes requested."}
                      {entry.mentor_note ? ` — ${entry.mentor_note}` : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 lg:h-fit">
          <div className="paper-card p-5">
            <h3 className="font-display text-base">Student</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {student?.course}
              {student?.institution_name ? ` · ${student.institution_name}` : ""}
            </p>
            <p className="mt-3 whitespace-pre-line text-sm">{application.motivation}</p>
          </div>

          <div className="paper-card p-5">
            <h3 className="font-display text-base">Final sign-off</h3>
            {application.mentor_approved ? (
              <p className="mt-2 text-sm text-success">You've signed off on this placement.</p>
            ) : (
              <form onSubmit={signOff} className="mt-3 space-y-3">
                <div>
                  <Label>Rating</Label>
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
                  placeholder="Comment for the record"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button type="submit" className="w-full" disabled={busy}>
                  Approve & rate
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
