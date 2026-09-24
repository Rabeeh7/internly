import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { homeForRole, type Role } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or join — Internly" },
      {
        name: "description",
        content:
          "Create an Internly account as a student, mentor or partner institution, or sign back in to your dashboard.",
      },
      { property: "og:title", content: "Sign in or join — Internly" },
      {
        property: "og:description",
        content: "Create an Internly account as a student, mentor or partner institution.",
      },
    ],
  }),
  component: AuthPage,
});

const ROLE_OPTIONS: { value: Role; label: string; hint: string }[] = [
  { value: "student", label: "Student", hint: "Find placements, pick a mentor, log your progress." },
  { value: "mentor", label: "Mentor", hint: "Guide assigned students and approve their work." },
  {
    value: "employer",
    label: "Employer / partner institution",
    hint: "Post opportunities and review applicants.",
  },
  {
    value: "admin",
    label: "Administrator",
    hint: "Platform overview, listings, mentor pool and escalations.",
  },
];

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState<Role>("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const afterSignIn = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    // Automatically claim admin for admin accounts if platform has no admin yet
    if (data.user.email?.toLowerCase().includes("admin")) {
      await supabase.rpc("claim_admin");
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, onboarded")
      .eq("id", data.user.id)
      .maybeSingle();

    if (isAdmin || profile?.role === "admin") {
      navigate({ to: "/admin" });
      return;
    }

    if (!profile || !profile.onboarded) {
      navigate({ to: "/onboarding" });
      return;
    }
    navigate({ to: homeForRole(profile.role as Role) });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/onboarding" },
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    if (data.session && data.user) {
      await supabase
        .from("profiles")
        .upsert({ id: data.user.id, role, name, email, onboarded: role === "admin" });
      if (role === "admin") {
        await supabase.rpc("claim_admin");
      }
      setBusy(false);
      toast.success("Account created successfully!");
      await afterSignIn();
      return;
    }

    // Try direct login with password immediately
    const loginAttempt = await supabase.auth.signInWithPassword({ email, password });
    if (loginAttempt.data?.session && loginAttempt.data?.user) {
      await supabase
        .from("profiles")
        .upsert({ id: loginAttempt.data.user.id, role, name, email, onboarded: role === "admin" });
      if (role === "admin") {
        await supabase.rpc("claim_admin");
      }
      setBusy(false);
      toast.success("Signed in successfully!");
      await afterSignIn();
      return;
    }

    setBusy(false);
    if (loginAttempt.error) {
      toast.error(
        loginAttempt.error.message.includes("Email not confirmed")
          ? "Supabase requires email confirmation for new signups. Please check your inbox or disable email confirmations in your Supabase Auth dashboard for instant direct signups."
          : loginAttempt.error.message,
      );
    }
    setMode("login");
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed in successfully!");
    await afterSignIn();
  };

  const google = async () => {
    window.localStorage.setItem("internly:pending", JSON.stringify({ role, name: "", email: "" }));
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <Link to="/" className="font-display text-xl font-semibold">
          Internly
        </Link>
        <div>
          <h2 className="font-display text-3xl leading-tight">
            One place for placements, mentors and sign-off.
          </h2>
          <p className="mt-4 max-w-md text-sm opacity-80">
            Students discover opportunities and pick a mentor. Mentors review progress. Partner
            institutions post roles and approve completed work.
          </p>
        </div>
        <p className="text-xs opacity-60">Internship & student exchange management</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 block font-display text-lg font-semibold lg:hidden">
            Internly
          </Link>

          <Tabs value={mode} onValueChange={setMode}>
              <TabsList className="mb-6 w-full">
                <TabsTrigger value="signup" className="flex-1">
                  Create account
                </TabsTrigger>
                <TabsTrigger value="login" className="flex-1">
                  Log in
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signup">
                <h1 className="section-title text-2xl">Join Internly</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick how you'll use Internly — it decides which dashboard you land on.
                </p>
                <form onSubmit={signUp} className="mt-6 space-y-4">
                  <div className="space-y-2">
                    {ROLE_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                          role === option.value
                            ? "border-primary bg-primary-soft/60"
                            : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          className="mt-1 accent-[var(--color-primary)]"
                          checked={role === option.value}
                          onChange={() => setRole(option.value)}
                        />
                        <span>
                          <span className="block text-sm font-medium">{option.label}</span>
                          <span className="block text-xs text-muted-foreground">{option.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Creating account…" : "Create account"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="login">
                <h1 className="section-title text-2xl">Welcome back</h1>
                <form onSubmit={signIn} className="mt-6 space-y-4">
                  <div>
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Signing in…" : "Log in"}
                  </Button>
                </form>
              </TabsContent>

              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={google}>
                Continue with Google
              </Button>
            </Tabs>
        </div>
      </div>
    </div>
  );
}
