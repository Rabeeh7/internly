import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { AppShell, EmptyState } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/app/apply/$listingId")({
  component: ApplyPage,
});

function ApplyPage() {
  const { listingId } = Route.useParams();
  const { data: me } = useMe();
  const navigate = useNavigate();
  const [motivation, setMotivation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  const { data: listing } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, title, category, location, remote, mode, duration, institutions(name)")
        .eq("id", listingId)
        .maybeSingle();
      return data;
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const studentId = me?.user?.id;
    if (!studentId) return;
    setBusy(true);

    let attachmentUrl: string | null = null;
    if (file) {
      const path = `${studentId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("applications")
        .upload(path, file, { upsert: true });
      if (uploadError) {
        toast.error("We couldn't upload that file, so we saved your application without it.");
      } else {
        attachmentUrl = path;
      }
    }

    const { data, error } = await supabase
      .from("applications")
      .insert({
        student_id: studentId,
        listing_id: listingId,
        motivation,
        attachment_url: attachmentUrl,
        status: "pending",
      })
      .select("id")
      .single();

    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCreated(data.id);
  };

  if (!listing) {
    return (
      <AppShell title="Apply">
        <EmptyState title="Opportunity not found" />
      </AppShell>
    );
  }

  const institution = listing.institutions as { name: string } | null;

  if (created) {
    return (
      <AppShell title="Application sent">
        <div className="paper-card max-w-xl p-8">
          <h2 className="section-title text-xl">You've applied to {listing.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {institution?.name} will review it. Next step: choose a mentor from the shortlist our
            admins curated for this category.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/app/applications/$id" params={{ id: created }}>
                Choose a mentor
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/applications">My applications</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Apply" description="One short form — the institution reads this first.">
      <form onSubmit={submit} className="grid max-w-3xl gap-6">
        <div className="paper-card p-5">
          <p className="text-xs text-muted-foreground">{institution?.name}</p>
          <h2 className="section-title mt-1 text-lg">{listing.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {listing.remote ? "Remote" : listing.location} · {listing.category} ·{" "}
            {listing.duration ?? "Flexible"}
          </p>
        </div>

        <div className="paper-card p-6">
          <Label htmlFor="motivation">Why this opportunity?</Label>
          <Textarea
            id="motivation"
            required
            rows={8}
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            placeholder="What draws you to this placement, and what will you bring to it?"
            className="mt-2"
          />

          <div className="mt-6">
            <Label htmlFor="file">Attachment (optional)</Label>
            <input
              id="file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-sm text-muted-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">CV, portfolio or transcript.</p>
          </div>
        </div>

        <div>
          <Button type="submit" disabled={busy} size="lg">
            {busy ? "Submitting…" : "Submit application"}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
