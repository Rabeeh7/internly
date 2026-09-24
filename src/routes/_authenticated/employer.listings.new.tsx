import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { CATEGORY_FALLBACK } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/employer/listings/new")({
  component: NewListing,
});

function NewListing() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const institutionId = me?.profile?.institution_id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState(false);
  const [mode, setMode] = useState<"internship" | "exchange">("internship");
  const [duration, setDuration] = useState("");
  const [openings, setOpenings] = useState(1);
  const [busy, setBusy] = useState(false);

  const { data: institution } = useQuery({
    queryKey: ["institution", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data } = await supabase
        .from("institutions")
        .select("name, verification_status")
        .eq("id", institutionId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("name").order("name");
      return (data ?? []).map((c) => c.name as string);
    },
  });

  const approved = institution?.verification_status === "approved";
  const options = categories?.length ? categories : CATEGORY_FALLBACK;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionId) return;
    setBusy(true);
    const { error } = await supabase.from("listings").insert({
      institution_id: institutionId,
      title,
      description,
      category: category || options[0] || "Other",
      location: remote ? null : location,
      remote,
      mode,
      duration,
      openings,
      status: "open",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Listing published.");
    navigate({ to: "/employer" });
  };

  return (
    <AppShell title="Post a listing" description="Students see this in their matched feed.">
      {!approved ? (
        <div className="paper-card max-w-xl border-warning/40 bg-warning/10 p-6">
          <p className="font-display text-base">Your organisation isn't verified yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Posting unlocks once an administrator approves {institution?.name ?? "your organisation"}.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="paper-card max-w-2xl space-y-5 p-6">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={6}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
              >
                <option value="">Select a category</option>
                {options.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="mode">Mode</Label>
              <select
                id="mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as "internship" | "exchange")}
                className="mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
              >
                <option value="internship">Internship</option>
                <option value="exchange">Exchange</option>
              </select>
            </div>
            <div>
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 12 weeks"
              />
            </div>
            <div>
              <Label htmlFor="openings">Openings</Label>
              <Input
                id="openings"
                type="number"
                min={1}
                value={openings}
                onChange={(e) => setOpenings(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium">Remote placement</p>
              <p className="text-xs text-muted-foreground">Hides the location field.</p>
            </div>
            <Switch checked={remote} onCheckedChange={setRemote} />
          </div>
          {!remote ? (
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                required
              />
            </div>
          ) : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Publishing…" : "Publish listing"}
          </Button>
        </form>
      )}
    </AppShell>
  );
}
