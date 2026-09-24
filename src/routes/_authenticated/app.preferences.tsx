import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { matchScore, CATEGORY_FALLBACK } from "@/lib/domain";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/app/preferences")({
  component: PreferencesPage,
});

function PreferencesPage() {
  const { data: me } = useMe();
  const studentId = me?.user?.id;
  const queryClient = useQueryClient();

  const [categories, setCategories] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState(false);
  const [mode, setMode] = useState<"internship" | "exchange" | "">("");
  const [loaded, setLoaded] = useState(false);

  const { data: categoryRows } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("name").order("name");
      return (data ?? []).map((c) => c.name as string);
    },
  });

  const { data: listings } = useQuery({
    queryKey: ["open-listings-for-count"],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("category, location, remote, mode, institutions!inner(verification_status)")
        .eq("status", "open")
        .eq("institutions.verification_status", "approved");
      return (data ?? []) as { category: string; location: string | null; remote: boolean; mode: string }[];
    },
  });

  const { data: saved } = useQuery({
    queryKey: ["preferences", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("student_preferences")
        .select("categories, location, remote, mode")
        .eq("student_id", studentId!)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (loaded || saved === undefined) return;
    setCategories(saved?.categories ?? []);
    setLocation(saved?.location ?? "");
    setRemote(saved?.remote ?? false);
    setMode((saved?.mode as "internship" | "exchange" | null) ?? "");
    setLoaded(true);
  }, [saved, loaded]);

  const options = categoryRows?.length ? categoryRows : CATEGORY_FALLBACK;

  const matchCount = useMemo(() => {
    const prefs = {
      categories,
      location: location || null,
      remote,
      mode: mode || null,
    } as const;
    return (listings ?? []).filter((l) => matchScore(l, prefs) >= 60).length;
  }, [listings, categories, location, remote, mode]);

  const persist = async (next: {
    categories: string[];
    location: string;
    remote: boolean;
    mode: string;
  }) => {
    if (!studentId) return;
    const { error } = await supabase.from("student_preferences").upsert({
      student_id: studentId,
      categories: next.categories,
      location: next.location || null,
      remote: next.remote,
      mode: next.mode ? (next.mode as "internship" | "exchange") : null,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["preferences", studentId] });
  };

  const toggleCategory = (name: string) => {
    const next = categories.includes(name)
      ? categories.filter((c) => c !== name)
      : [...categories, name];
    setCategories(next);
    persist({ categories: next, location, remote, mode });
  };

  return (
    <AppShell
      title="Preferences"
      description="These drive your match percentages and the order of your feed."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="paper-card p-6">
          <h2 className="section-title text-lg">Categories</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pick the domains you care about.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {options.map((name) => {
              const active = categories.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleCategory(name)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="location">Preferred location</Label>
              <Input
                id="location"
                value={location}
                placeholder="e.g. Berlin, Germany"
                onChange={(e) => setLocation(e.target.value)}
                onBlur={() => persist({ categories, location, remote, mode })}
              />
            </div>
            <div>
              <Label htmlFor="mode">Mode</Label>
              <select
                id="mode"
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value as "internship" | "exchange" | "");
                  persist({ categories, location, remote, mode: e.target.value });
                }}
                className="mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
              >
                <option value="">No preference</option>
                <option value="internship">Internship</option>
                <option value="exchange">Exchange</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium">Open to remote placements</p>
              <p className="text-xs text-muted-foreground">Boosts remote opportunities in your feed.</p>
            </div>
            <Switch
              checked={remote}
              onCheckedChange={(value) => {
                setRemote(value);
                persist({ categories, location, remote: value, mode });
              }}
            />
          </div>
        </div>

        <div className="paper-card h-fit p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Strong matches now</p>
          <p className="stat-value mt-2">{matchCount}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Opportunities scoring 60% or higher against these preferences. Changes save as you go.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
