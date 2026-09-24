import { createFileRoute, Link } from "@tanstack/react-router";
import heroImage from "@/assets/hero-students.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Internly — internships, exchanges and mentors in one place" },
      {
        name: "description",
        content:
          "Internly connects students to internships and exchange placements, with admin-curated mentors and verified partner institutions from application to certificate.",
      },
      { property: "og:title", content: "Internly — internships, exchanges and mentors in one place" },
      {
        property: "og:description",
        content:
          "Discover placements, apply, pick a mentor and finish with a verified certificate.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    title: "Discover",
    body: "Set your preferences once and see internships and exchange semesters ranked by how well they match.",
  },
  {
    title: "Apply",
    body: "One short application per opportunity, reviewed by the partner institution that posted it.",
  },
  {
    title: "Get mentored",
    body: "Choose a mentor from an admin-curated shortlist, log your progress, and finish with a signed-off certificate.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-display text-xl font-semibold">Internly</span>
        <nav className="flex items-center gap-2">
          <Link to="/auth" className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
            Log in
          </Link>
          <Button asChild size="sm">
            <Link to="/auth">Get started</Link>
          </Button>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-16 pt-8 lg:grid-cols-2 lg:pt-16">
        <div>
          <p className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
            Internship & student exchange management
          </p>
          <h1 className="mt-5 font-display text-4xl leading-[1.1] md:text-5xl">
            Every placement, mentor and approval in one trusted place.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground">
            Internly takes students from discovering an opportunity to a verified certificate — with
            mentors, partner institutions and administrators working from the same record.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Get started</Link>
            </Button>
            <Link
              to="/auth"
              className="text-sm font-medium text-accent underline decoration-accent/40 underline-offset-4"
            >
              For institutions →
            </Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <img
            src={heroImage}
            alt="Students walking and talking in a university courtyard"
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      <section className="border-y border-border bg-card/60">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="section-title text-2xl">How it works</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="paper-card p-6">
                <span className="font-display text-sm text-accent">0{index + 1}</span>
                <h3 className="mt-2 font-display text-lg">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-8 sm:grid-cols-4">
          <div>
            <p className="font-display text-lg font-semibold">Internly</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Internship and student exchange management.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Students</p>
            <Link to="/auth" className="mt-2 block text-sm text-muted-foreground hover:text-foreground">
              Find a placement
            </Link>
          </div>
          <div>
            <p className="text-sm font-medium">Mentors</p>
            <Link to="/auth" className="mt-2 block text-sm text-muted-foreground hover:text-foreground">
              Join the mentor pool
            </Link>
          </div>
          <div>
            <p className="text-sm font-medium">Institutions</p>
            <Link to="/auth" className="mt-2 block text-sm text-muted-foreground hover:text-foreground">
              Post opportunities
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
