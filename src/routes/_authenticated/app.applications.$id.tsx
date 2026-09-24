import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { AppShell, EmptyState } from "@/components/AppShell";
import { STATUS_LABEL, STATUS_TONE, formatDate } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/app/applications/$id")({
  component: ApplicationDetail,
});

type MentorOption = {
  mentor_id: string;
  profiles: { name: string; expertise_tags: string[]; max_load: number } | null;
};

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          aria-label={`${star} stars`}
          className={`text-2xl leading-none transition-colors ${
            star <= value ? "text-accent" : "text-border"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function ApplicationDetail() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [mentorStars, setMentorStars] = useState(5);
  const [employerStars, setEmployerStars] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: application, isLoading } = useQuery({
    queryKey: ["application", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(
          "*, listings(title, category, mode, institutions(name)), profiles:selected_mentor_id(name)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const listing = application?.listings as {
    title: string;
    category: string;
    mode: string;
    institutions: { name: string } | null;
  } | null;

  const { data: mentors } = useQuery({
    queryKey: ["mentor-shortlist", listing?.category],
    enabled: !!listing?.category && !application?.selected_mentor_id,
    queryFn: async () => {
      const { data: pool } = await supabase
        .from("mentor_pool")
        .select("mentor_id, profiles:mentor_id(name, expertise_tags, max_load)")
        .eq("category", listing!.category);

      const rows = (pool ?? []) as MentorOption[];
      if (rows.length === 0) return [];

      const { data: loads } = await supabase
        .from("applications")
        .select("selected_mentor_id")
        .in(
          "selected_mentor_id",
          rows.map((r) => r.mentor_id),
        )
        .in("status", ["mentor_selected", "approved", "in_progress"]);

      const loadMap = new Map<string, number>();
      (loads ?? []).forEach((row) => {
        if (!row.selected_mentor_id) return;
        loadMap.set(row.selected_mentor_id, (loadMap.get(row.selected_mentor_id) ?? 0) + 1);
      });

      return rows
        .map((row) => ({ ...row, load: loadMap.get(row.mentor_id) ?? 0 }))
        .filter((row) => row.load < (row.profiles?.max_load ?? 5));
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

  const { data: ratings } = useQuery({
    queryKey: ["ratings", id],
    queryFn: async () => {
      const { data } = await supabase.from("ratings").select("from_user, to_role").eq("application_id", id);
      return data ?? [];
    },
  });

  const selectMentor = async (mentorId: string) => {
    setBusy(true);
    const { error } = await supabase
      .from("applications")
      .update({ selected_mentor_id: mentorId, status: "mentor_selected" })
      .eq("id", id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("notifications").insert({
      user_id: mentorId,
      message: "A student selected you as their mentor.",
      link: `/mentor/applications/${id}`,
    });
    toast.success("Mentor selected.");
    queryClient.invalidateQueries({ queryKey: ["application", id] });
  };

  const addFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("follow_ups").insert({
      application_id: id,
      content,
      link_url: link || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setContent("");
    setLink("");
    if (application?.status === "approved") {
      await supabase.from("applications").update({ status: "in_progress" }).eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["application", id] });
    }
    queryClient.invalidateQueries({ queryKey: ["follow-ups", id] });
    toast.success("Follow-up logged.");
  };

  const submitRatings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me?.user?.id || !application) return;
    setBusy(true);
    const rows = [
      {
        application_id: id,
        from_user: me.user.id,
        to_user: application.selected_mentor_id,
        from_role: "student" as const,
        to_role: "mentor" as const,
        stars: mentorStars,
        comment: ratingComment || null,
      },
      {
        application_id: id,
        from_user: me.user.id,
        to_user: null,
        from_role: "student" as const,
        to_role: "employer" as const,
        stars: employerStars,
        comment: ratingComment || null,
      },
    ];
    const { error } = await supabase.from("ratings").insert(rows);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["ratings", id] });
    toast.success("Thanks for the feedback.");
  };

  if (isLoading) {
    return (
      <AppShell title="Application">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (!application) {
    return (
      <AppShell title="Application">
        <EmptyState title="Application not found" />
      </AppShell>
    );
  }

  const mentorName = (application.profiles as { name: string } | null)?.name;
  const complete = application.mentor_approved && application.employer_approved;
  const alreadyRated = (ratings ?? []).some((r) => r.from_user === me?.user?.id);

  return (
    <AppShell
      title={listing?.title ?? "Application"}
      description={listing?.institutions?.name ?? undefined}
      actions={
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_TONE[application.status] ?? "bg-muted"}`}
        >
          {STATUS_LABEL[application.status] ?? application.status}
        </span>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {!application.selected_mentor_id ? (
            <div className="paper-card p-6">
              <h2 className="section-title text-lg">Choose your mentor</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These mentors were recommended by our admins for {listing?.category}. Pick one — this is
                your choice, not an assignment.
              </p>
              {mentors?.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No mentor has capacity for this category right now. An admin will extend the pool.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {mentors?.map((mentor) => (
                    <div key={mentor.mentor_id} className="rounded-xl border border-border p-4">
                      <p className="font-display text-base">{mentor.profiles?.name}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(mentor.profiles?.expertise_tags ?? []).map((tag) => (
                          <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {mentor.load} of {mentor.profiles?.max_load ?? 5} student slots in use
                      </p>
                      <Button
                        className="mt-3 w-full"
                        size="sm"
                        disabled={busy}
                        onClick={() => selectMentor(mentor.mentor_id)}
                      >
                        Select mentor
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="paper-card p-6">
            <h2 className="section-title text-lg">Log a follow-up</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your mentor reviews these and can ask for changes.
            </p>
            <form onSubmit={addFollowUp} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="content">What did you work on?</Label>
                <Textarea
                  id="content"
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="link">Link (optional)</Label>
                <Input
                  id="link"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://"
                />
              </div>
              <Button type="submit" disabled={busy}>
                Add follow-up
              </Button>
            </form>

            <div className="mt-8 space-y-4">
              {followUps?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No follow-ups logged yet.</p>
              ) : (
                followUps?.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          entry.status === "approved"
                            ? "bg-success/15 text-success"
                            : entry.status === "changes_requested"
                              ? "bg-warning/25 text-warning-foreground"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {entry.status === "approved"
                          ? "Mentor approved"
                          : entry.status === "changes_requested"
                            ? "Changes requested"
                            : "Awaiting review"}
                      </span>
                    </div>
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
                    {entry.mentor_note ? (
                      <p className="mt-2 rounded-lg bg-secondary p-2 text-xs">
                        Mentor: {entry.mentor_note}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          {complete ? (
            <div className="paper-card p-6 print:border-0">
              <h2 className="section-title text-lg">Certificate</h2>
              <div className="mt-4 rounded-xl border-2 border-primary/30 bg-card p-8 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Certificate of completion
                </p>
                <p className="mt-4 font-display text-2xl">{me?.profile?.name}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  completed {listing?.title} at {listing?.institutions?.name}
                </p>
                <p className="mt-6 font-mono text-xs text-muted-foreground">
                  {application.certificate_id ?? "INTLY-PENDING"}
                </p>
                <div className="mt-4 flex justify-center">
                  <img
                    alt="Certificate verification code"
                    width={96}
                    height={96}
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(
                      application.certificate_id ?? application.id,
                    )}`}
                  />
                </div>
              </div>
              <Button className="mt-4 print:hidden" onClick={() => window.print()}>
                Download PDF
              </Button>

              {!alreadyRated ? (
                <form onSubmit={submitRatings} className="mt-8 space-y-4 print:hidden">
                  <h3 className="font-display text-base">Rate your experience</h3>
                  <div>
                    <Label>Your mentor {mentorName ? `(${mentorName})` : ""}</Label>
                    <StarPicker value={mentorStars} onChange={setMentorStars} />
                  </div>
                  <div>
                    <Label>{listing?.institutions?.name}</Label>
                    <StarPicker value={employerStars} onChange={setEmployerStars} />
                  </div>
                  <Textarea
                    rows={3}
                    placeholder="Anything you'd like to add?"
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                  />
                  <Button type="submit" disabled={busy}>
                    Submit ratings
                  </Button>
                </form>
              ) : (
                <p className="mt-6 text-sm text-muted-foreground print:hidden">
                  Thanks — your ratings are recorded.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className="space-y-4 lg:h-fit">
          <div className="paper-card p-5">
            <h3 className="font-display text-base">Progress</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span>Applied</span>
                <span className="text-success">✓</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Mentor selected</span>
                <span className={application.selected_mentor_id ? "text-success" : "text-muted-foreground"}>
                  {application.selected_mentor_id ? "✓" : "—"}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Employer approved application</span>
                <span
                  className={
                    ["approved", "in_progress", "completed"].includes(application.status)
                      ? "text-success"
                      : "text-muted-foreground"
                  }
                >
                  {["approved", "in_progress", "completed"].includes(application.status) ? "✓" : "—"}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Mentor sign-off</span>
                <span className={application.mentor_approved ? "text-success" : "text-muted-foreground"}>
                  {application.mentor_approved ? "✓" : "—"}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Employer sign-off</span>
                <span className={application.employer_approved ? "text-success" : "text-muted-foreground"}>
                  {application.employer_approved ? "✓" : "—"}
                </span>
              </li>
            </ul>
          </div>
          <div className="paper-card p-5">
            <h3 className="font-display text-base">Your mentor</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {mentorName ?? "Not selected yet"}
            </p>
          </div>
          <div className="paper-card p-5">
            <h3 className="font-display text-base">Your application</h3>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
              {application.motivation}
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
