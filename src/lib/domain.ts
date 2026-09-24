export const CATEGORY_FALLBACK = [
  "Software Engineering",
  "Data & AI",
  "Design",
  "Public Health",
  "Sustainability",
  "Business & Finance",
];

export type Preferences = {
  categories: string[];
  location: string | null;
  remote: boolean;
  mode: "internship" | "exchange" | null;
} | null;

type ListingLike = {
  category: string;
  location: string | null;
  remote: boolean;
  mode: string;
};

/** Simple explainable match score: category 60, location/remote 25, mode 15. */
export function matchScore(listing: ListingLike, prefs: Preferences): number {
  if (!prefs) return 50;
  let score = 0;
  if (prefs.categories.length === 0) score += 30;
  else if (prefs.categories.includes(listing.category)) score += 60;
  if (!prefs.location && !prefs.remote) score += 12;
  else if (prefs.remote && listing.remote) score += 25;
  else if (prefs.location && listing.location === prefs.location) score += 25;
  if (!prefs.mode) score += 8;
  else if (prefs.mode === listing.mode) score += 15;
  return Math.min(99, Math.max(12, score));
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  mentor_selected: "Mentor selected",
  approved: "Approved",
  rejected: "Rejected",
  in_progress: "In progress",
  completed: "Completed",
};

export const STATUS_TONE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  mentor_selected: "bg-primary-soft text-primary",
  approved: "bg-accent-soft text-accent",
  rejected: "bg-destructive/10 text-destructive",
  in_progress: "bg-primary-soft text-primary",
  completed: "bg-success/15 text-success",
};

export const DAY = 1000 * 60 * 60 * 24;

export function daysSince(date: string | null | undefined) {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / DAY);
}

export function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
