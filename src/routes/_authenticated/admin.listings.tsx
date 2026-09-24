import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, EmptyState } from "@/components/AppShell";
import { AdminGate } from "./admin.index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/listings")({
  component: () => (
    <AdminGate>
      <AdminListings />
    </AdminGate>
  ),
});

function AdminListings() {
  const queryClient = useQueryClient();
  const [newCategory, setNewCategory] = useState("");

  const { data: listings, isLoading } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, category, status, featured, institutions(name, verification_status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      return data ?? [];
    },
  });

  const update = async (
    id: string,
    patch: { featured?: boolean; status?: "open" | "closed" | "taken_down" },
  ) => {
    const { error } = await supabase.from("listings").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    const { error } = await supabase.from("categories").insert({ name: newCategory.trim() });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewCategory("");
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    toast.success("Category added.");
  };

  const removeCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
  };

  return (
    <AppShell
      title="Listings & categories"
      description="Feature strong opportunities, take down anything that breaks the rules."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : listings?.length === 0 ? (
        <EmptyState title="No listings yet" />
      ) : (
        <div className="paper-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings?.map((listing) => {
                const institution = listing.institutions as
                  | { name: string; verification_status: string }
                  | null;
                return (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">
                      {listing.title}
                      {listing.featured ? (
                        <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                          Featured
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {institution?.name}
                      <span className="block text-xs capitalize">
                        {institution?.verification_status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{listing.category}</TableCell>
                    <TableCell className="capitalize">{listing.status.replace("_", " ")}</TableCell>
                    <TableCell className="space-x-2 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => update(listing.id, { featured: !listing.featured })}
                      >
                        {listing.featured ? "Unfeature" : "Feature"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          update(listing.id, {
                            status: listing.status === "taken_down" ? "open" : "taken_down",
                          })
                        }
                      >
                        {listing.status === "taken_down" ? "Restore" : "Take down"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <h2 className="section-title mt-8 text-lg">Categories</h2>
      <div className="paper-card mt-3 max-w-xl p-6">
        <div className="flex flex-wrap gap-2">
          {categories?.map((category) => (
            <span
              key={category.id}
              className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm"
            >
              {category.name}
              <button
                type="button"
                onClick={() => removeCategory(category.id)}
                aria-label={`Remove ${category.name}`}
                className="text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={addCategory} className="mt-4 flex gap-2">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Add a category"
          />
          <Button type="submit">Add</Button>
        </form>
      </div>
    </AppShell>
  );
}
