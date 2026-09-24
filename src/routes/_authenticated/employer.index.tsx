import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { AppShell, EmptyState, StatCard } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/employer/")({
  component: EmployerDashboard,
});

function EmployerDashboard() {
  const { data: me } = useMe();
  const institutionId = me?.profile?.institution_id;

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

  const { data: listings, isLoading } = useQuery({
    queryKey: ["employer-listings", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, status, category, openings, applications(id, status)")
        .eq("institution_id", institutionId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalApplicants = (listings ?? []).reduce(
    (sum, l) => sum + ((l.applications as { id: string }[] | null)?.length ?? 0),
    0,
  );
  const inProgress = (listings ?? []).reduce(
    (sum, l) =>
      sum +
      ((l.applications as { status: string }[] | null)?.filter((a) =>
        ["approved", "in_progress"].includes(a.status),
      ).length ?? 0),
    0,
  );
  const openListings = (listings ?? []).filter((l) => l.status === "open").length;
  const approved = institution?.verification_status === "approved";

  return (
    <AppShell
      title={institution?.name ?? "Employer dashboard"}
      description="Your listings and the pipeline behind them."
      actions={
        approved ? (
          <Button asChild size="sm">
            <Link to="/employer/listings/new">Post a listing</Link>
          </Button>
        ) : null
      }
    >
      {!approved ? (
        <div className="paper-card mb-6 border-warning/40 bg-warning/10 p-5">
          <p className="font-display text-base">Verification pending</p>
          <p className="mt-1 text-sm text-muted-foreground">
            An administrator is reviewing {institution?.name ?? "your organisation"}. You can post
            listings as soon as it's approved.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open listings" value={openListings} />
        <StatCard label="Total applicants" value={totalApplicants} />
        <StatCard label="Students in progress" value={inProgress} />
      </div>

      <h2 className="section-title mt-8 text-lg">Your listings</h2>
      {isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      ) : listings?.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="No listings yet" hint="Post your first opportunity to start receiving applications." />
        </div>
      ) : (
        <div className="paper-card mt-3 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applicants</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings?.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell className="font-medium">{listing.title}</TableCell>
                  <TableCell className="text-muted-foreground">{listing.category}</TableCell>
                  <TableCell className="capitalize">{listing.status.replace("_", " ")}</TableCell>
                  <TableCell>{(listing.applications as { id: string }[] | null)?.length ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      to="/employer/listings/$id"
                      params={{ id: listing.id }}
                      className="text-sm text-accent underline underline-offset-4"
                    >
                      View applicants
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}
