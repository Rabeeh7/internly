import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { AppShell, EmptyState } from "@/components/AppShell";
import { matchScore, type Preferences } from "@/lib/domain";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/")({
  component: StudentDashboard,
});

type Listing = {
  id: string;
  title: string;
  category: string;
  location: string | null;
  remote: boolean;
  mode: string;
  duration: string | null;
  institution_id: string;
  institutions: { name: string; verification_status: string } | null;
};

function StudentDashboard() {
  const { data: me } = useMe();
  const studentId = me?.user?.id;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [mode, setMode] = useState("all");

  const { data: prefs } = useQuery({
    queryKey: ["preferences", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("student_preferences")
        .select("categories, location, remote, mode")
        .eq("student_id", studentId!)
        .maybeSingle();
      return (data as Preferences) ?? null;
    },
  });

  const { data: listings, isLoading } = useQuery({
    queryKey: ["open-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*, institutions!inner(name, verification_status)")
        .eq("status", "open")
        .eq("institutions.verification_status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Listing[];
    },
  });

  const categories = useMemo(
    () => Array.from(new Set((listings ?? []).map((l) => l.category))).sort(),
    [listings],
  );

  const ranked = useMemo(() => {
    const rows = (listings ?? [])
      .filter((l) => (category === "all" ? true : l.category === category))
      .filter((l) => (mode === "all" ? true : l.mode === mode))
      .filter((l) =>
        search.trim()
          ? (l.title + " " + (l.institutions?.name ?? "")).toLowerCase().includes(search.toLowerCase())
          : true,
      )
      .map((l) => ({ ...l, score: matchScore(l, prefs ?? null) }));
    return rows.sort((a, b) => b.score - a.score);
  }, [listings, prefs, category, mode, search]);

  return (
    <AppShell
      title={me?.profile?.name ? `Hello, ${me.profile.name.split(" ")[0]}` : "Dashboard"}
      description="Opportunities ranked against your preferences. Verified institutions only."
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/app/preferences">Edit preferences</Link>
        </Button>
      }
    >
      <div className="paper-card mb-6 flex flex-wrap items-center gap-3 p-4">
        <Input
          placeholder="Search titles or institutions"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
        >
          <option value="all">Internships & exchanges</option>
          <option value="internship">Internships</option>
          <option value="exchange">Exchanges</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading opportunities…</p>
      ) : ranked.length === 0 ? (
        <EmptyState title="No opportunities match those filters" hint="Try widening your search." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ranked.map((listing) => (
            <Link
              key={listing.id}
              to="/app/listings/$id"
              params={{ id: listing.id }}
              className="paper-card flex flex-col gap-3 p-5 transition-colors hover:border-primary"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{listing.institutions?.name}</p>
                  <h3 className="mt-1 font-display text-lg leading-tight">{listing.title}</h3>
                </div>
                <span className="shrink-0 rounded-full bg-primary-soft px-2 py-1 text-xs font-medium text-primary">
                  {listing.score}% match
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {listing.remote ? "Remote" : listing.location} · {listing.duration ?? "Flexible"}
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                  {listing.category}
                </span>
                <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize">
                  {listing.mode}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
