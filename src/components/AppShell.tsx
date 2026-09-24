import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, type Role } from "@/lib/auth";
import { Button } from "@/components/ui/button";

type NavItem = { to: string; label: string };

const NAV: Record<Role, NavItem[]> = {
  student: [
    { to: "/app", label: "Dashboard" },
    { to: "/app/applications", label: "My applications" },
    { to: "/app/preferences", label: "Preferences" },
    { to: "/app/aptitude", label: "Aptitude test" },
    { to: "/app/profile", label: "Profile" },
  ],
  mentor: [
    { to: "/mentor", label: "Dashboard" },
    { to: "/mentor/applications", label: "Assigned students" },
    { to: "/app/profile", label: "Profile" },
  ],
  employer: [
    { to: "/employer", label: "Dashboard" },
    { to: "/employer/listings/new", label: "Post a listing" },
    { to: "/app/profile", label: "Profile" },
  ],
  admin: [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/listings", label: "Listings & categories" },
    { to: "/admin/mentors", label: "Mentor pool" },
    { to: "/admin/escalations", label: "Escalations" },
    { to: "/admin/reports", label: "Reports" },
  ],
};

export function AppShell({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string | undefined;
  children: ReactNode;
  actions?: ReactNode | undefined;
}) {
  const { data } = useMe();
  const navigate = useNavigate();
  const role = (data?.profile?.role ?? "student") as Role;
  const items = NAV[role] ?? NAV.student;

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar px-4 py-6 text-sidebar-foreground md:flex">
        <Link to="/" className="mb-8 block font-display text-xl font-semibold tracking-tight">
          Internly
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/app" || item.to === "/admin" }}
              className="rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent font-medium" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-sidebar-border pt-4">
          <p className="truncate text-sm font-medium">{data?.profile?.name || "Your account"}</p>
          <p className="text-xs capitalize opacity-70">{role}</p>
          {data?.isAdmin && role !== "admin" ? (
            <Link
              to="/admin"
              className="mt-2 block text-xs text-primary underline underline-offset-4 hover:opacity-100"
            >
              Switch to Admin Dashboard →
            </Link>
          ) : null}
          {role === "admin" ? (
            <Link
              to="/app"
              className="mt-2 block text-xs underline underline-offset-4 opacity-70 hover:opacity-100"
            >
              ← Student view
            </Link>
          ) : null}
          <button
            onClick={signOut}
            className="mt-3 block text-xs underline underline-offset-4 opacity-80 hover:opacity-100"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-6 py-6">
          <div>
            <h1 className="section-title text-2xl">{title}</h1>
            {description ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <Button variant="outline" size="sm" className="md:hidden" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
        <div className="px-6 py-6">{children}</div>
        <nav className="flex gap-1 overflow-x-auto border-t border-border px-4 py-3 md:hidden">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs text-muted-foreground"
              activeProps={{ className: "bg-primary-soft text-primary font-medium" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string | undefined;
}) {
  return (
    <div className="paper-card p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="stat-value mt-2 text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string | undefined }) {
  return (
    <div className="paper-card p-10 text-center">
      <p className="font-display font-medium">{title}</p>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
