import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { homeForRole, useMe, type Role } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

type Pending = { role: Exclude<Role, "admin">; name: string; email: string };

function readPending(): Pending | null {
  try {
    const raw = window.localStorage.getItem("internly:pending");
    return raw ? (JSON.parse(raw) as Pending) : null;
  } catch {
    return null;
  }
}

function Onboarding() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useMe();
  const [role, setRole] = useState<Exclude<Role, "admin">>("student");
  const [name, setName] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [course, setCourse] = useState("");
  const [orgType, setOrgType] = useState("Company");
  const [website, setWebsite] = useState("");
  const [expertise, setExpertise] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    const pending = readPending();
    const rawRole = (data?.profile?.role ?? pending?.role ?? "student") as Role;
    setRole(rawRole === "admin" ? "student" : (rawRole as Exclude<Role, "admin">));
    const metaName = data?.user?.user_metadata?.["full_name"];
    setName(data?.profile?.name || pending?.name || (typeof metaName === "string" ? metaName : ""));
    setReady(true);
  }, [isLoading, data]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = data?.user;
    if (!user) return;
    setBusy(true);

    let institutionId: string | null = data?.profile?.institution_id ?? null;

    if (role === "employer") {
      const { data: inst, error: instError } = await supabase
        .from("institutions")
        .insert({
          name: institutionName,
          type: orgType,
          website,
          owner_id: user.id,
          verification_status: "pending",
        })
        .select("id")
        .single();
      if (instError) {
        setBusy(false);
        toast.error(instError.message);
        return;
      }
      institutionId = inst.id;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      role,
      name,
      email: user.email ?? null,
      institution_name: role === "employer" ? institutionName : institutionName || null,
      course: role === "student" ? course : null,
      institution_id: institutionId,
      expertise_tags:
        role === "mentor"
          ? expertise
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      onboarded: true,
    });

    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.localStorage.removeItem("internly:pending");
    await refetch();
    if (role === "employer") {
      toast.success("Organisation submitted — an admin will verify it before you can post.");
    }
    navigate({ to: homeForRole(role) });
  };

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <form onSubmit={submit} className="paper-card w-full max-w-xl p-8">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Step 1 of 1</p>
        <h1 className="section-title mt-1 text-2xl">
          {role === "employer" ? "Tell us about your organisation" : "Complete your profile"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {role === "employer"
            ? "We verify every partner institution before listings go live."
            : "This is what mentors and institutions will see."}
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          {role === "student" ? (
            <>
              <div>
                <Label htmlFor="institution">Your institution</Label>
                <Input
                  id="institution"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="e.g. Delhi University"
                  required
                />
              </div>
              <div>
                <Label htmlFor="course">Course</Label>
                <Input
                  id="course"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="e.g. B.Tech Computer Science"
                  required
                />
              </div>
            </>
          ) : null}

          {role === "mentor" ? (
            <div>
              <Label htmlFor="expertise">Areas of expertise</Label>
              <Input
                id="expertise"
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
                placeholder="Data & AI, Software Engineering"
              />
              <p className="mt-1 text-xs text-muted-foreground">Separate with commas.</p>
            </div>
          ) : null}

          {role === "employer" ? (
            <>
              <div>
                <Label htmlFor="org">Organisation name</Label>
                <Input
                  id="org"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="type">Organisation type</Label>
                <select
                  id="type"
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                >
                  <option>Company</option>
                  <option>University</option>
                  <option>NGO</option>
                  <option>Government</option>
                </select>
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://"
                />
              </div>
              <div className="rounded-lg border border-border bg-accent-soft/50 p-3 text-sm">
                An admin reviews new organisations. You can explore Internly right away, but posting
                listings unlocks once your organisation is approved.
              </div>
            </>
          ) : null}
        </div>

        <Button type="submit" className="mt-6 w-full" disabled={busy}>
          {busy ? "Saving…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
