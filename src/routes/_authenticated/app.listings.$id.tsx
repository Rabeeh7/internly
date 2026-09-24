import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, EmptyState } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/listings/$id")({
  component: ListingDetail,
});

function ListingDetail() {
  const { id } = Route.useParams();

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*, institutions(name, logo_url, verification_status, website, type)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <AppShell title="Opportunity">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (!listing) {
    return (
      <AppShell title="Opportunity">
        <EmptyState title="This opportunity is no longer available" />
      </AppShell>
    );
  }

  const institution = listing.institutions as {
    name: string;
    logo_url: string | null;
    verification_status: string;
    website: string | null;
    type: string | null;
  } | null;

  return (
    <AppShell title={listing.title} description={institution?.name ?? undefined}>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="paper-card p-6">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-border px-2 py-0.5 text-xs">
              {listing.category}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize">
              {listing.mode}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs">
              {listing.remote ? "Remote" : listing.location}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs">
              {listing.duration ?? "Flexible duration"}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs">
              {listing.openings} opening{listing.openings === 1 ? "" : "s"}
            </span>
          </div>
          <h2 className="section-title mt-6 text-lg">About this opportunity</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {listing.description}
          </p>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
          <div className="paper-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-lg bg-primary-soft font-display text-primary">
                {(institution?.name ?? "?").slice(0, 1)}
              </div>
              <div>
                <p className="text-sm font-medium">{institution?.name}</p>
                <p className="text-xs text-muted-foreground">{institution?.type}</p>
              </div>
            </div>
            {institution?.verification_status === "approved" ? (
              <p className="mt-3 inline-flex rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                Verified institution
              </p>
            ) : (
              <p className="mt-3 inline-flex rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning-foreground">
                Verification pending
              </p>
            )}
          </div>
          <Button asChild className="w-full" size="lg">
            <Link to="/app/apply/$listingId" params={{ listingId: listing.id }}>
              Apply now
            </Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
