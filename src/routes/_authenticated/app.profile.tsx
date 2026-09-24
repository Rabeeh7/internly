import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { data: me, refetch } = useMe();
  const [name, setName] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [course, setCourse] = useState("");
  const [expertise, setExpertise] = useState("");
  const [maxLoad, setMaxLoad] = useState(5);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!me?.profile) return;
    setName(me.profile.name ?? "");
    setInstitutionName(me.profile.institution_name ?? "");
    setCourse(me.profile.course ?? "");
    setExpertise((me.profile.expertise_tags ?? []).join(", "));
    setMaxLoad(me.profile.max_load ?? 5);
  }, [me?.profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me?.user?.id) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name,
        institution_name: institutionName || null,
        course: course || null,
        expertise_tags: expertise
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        max_load: maxLoad,
      })
      .eq("id", me.user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refetch();
    toast.success("Profile saved.");
  };

  const role = me?.profile?.role;

  return (
    <AppShell title="Profile" description="What mentors and institutions see.">
      <form onSubmit={save} className="paper-card max-w-xl space-y-4 p-6">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={me?.user?.email ?? ""} disabled />
        </div>
        {role === "student" ? (
          <>
            <div>
              <Label htmlFor="institution">Institution</Label>
              <Input
                id="institution"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="course">Course</Label>
              <Input id="course" value={course} onChange={(e) => setCourse(e.target.value)} />
            </div>
          </>
        ) : null}
        {role === "mentor" ? (
          <>
            <div>
              <Label htmlFor="expertise">Expertise tags</Label>
              <Input
                id="expertise"
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
                placeholder="Data & AI, Design"
              />
            </div>
            <div>
              <Label htmlFor="load">Maximum students at once</Label>
              <Input
                id="load"
                type="number"
                min={1}
                max={20}
                value={maxLoad}
                onChange={(e) => setMaxLoad(Number(e.target.value))}
              />
            </div>
          </>
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </AppShell>
  );
}
