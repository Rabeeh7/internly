import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, EmptyState } from "@/components/AppShell";
import { AdminGate } from "./admin.index";
import { CATEGORY_FALLBACK } from "@/lib/domain";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/mentors")({
  component: () => (
    <AdminGate>
      <MentorPool />
    </AdminGate>
  ),
});

function MentorPool() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<string>("");

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data: mentors, isLoading } = useQuery({
    queryKey: ["mentors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, expertise_tags, max_load, institution_name")
        .eq("role", "mentor")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pool } = useQuery({
    queryKey: ["mentor-pool"],
    queryFn: async () => {
      const { data } = await supabase.from("mentor_pool").select("id, mentor_id, category");
      return data ?? [];
    },
  });

  const { data: loads } = useQuery({
    queryKey: ["mentor-loads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("selected_mentor_id, status")
        .in("status", ["mentor_selected", "approved", "in_progress"]);
      const counts: Record<string, number> = {};
      (data ?? []).forEach((row) => {
        if (row.selected_mentor_id) {
          counts[row.selected_mentor_id] = (counts[row.selected_mentor_id] ?? 0) + 1;
        }
      });
      return counts;
    },
  });

  const options = categories?.length ? categories.map((c) => c.name as string) : CATEGORY_FALLBACK;
  const activeCategory = category || options[0] || "Other";

  const inPool = (mentorId: string) =>
    (pool ?? []).find((row) => row.mentor_id === mentorId && row.category === activeCategory);

  const toggle = async (mentorId: string) => {
    const existing = inPool(mentorId);
    if (existing) {
      const { error } = await supabase.from("mentor_pool").delete().eq("id", existing.id);
      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("mentor_pool")
        .insert({ mentor_id: mentorId, category: activeCategory });
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    queryClient.invalidateQueries({ queryKey: ["mentor-pool"] });
  };

  return (
    <AppShell
      title="Mentor pool"
      description="Students only choose from the mentors you curate for each category."
    >
      <div className="flex flex-wrap gap-2">
        {options.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setCategory(name)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              activeCategory === name
                ? "border-primary bg-primary-soft text-primary"
                : "border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : mentors?.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No mentors registered yet" />
        </div>
      ) : (
        <div className="paper-card mt-6 divide-y divide-border">
          {mentors?.map((mentor) => {
            const selected = !!inPool(mentor.id);
            const load = loads?.[mentor.id] ?? 0;
            const full = load >= (mentor.max_load ?? 5);
            return (
              <div key={mentor.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-display text-base">{mentor.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(mentor.expertise_tags ?? []).join(", ") || "No expertise tags yet"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Load {load}/{mentor.max_load ?? 5}
                    {full ? " · at capacity" : ""}
                  </p>
                </div>
                <Button size="sm" variant={selected ? "default" : "outline"} onClick={() => toggle(mentor.id)}>
                  {selected ? "In pool" : "Add to pool"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
