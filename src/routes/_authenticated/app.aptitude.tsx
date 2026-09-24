import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/app/aptitude")({
  component: AptitudeTest,
});

type Question = {
  prompt: string;
  options: { label: string; category: string }[];
};

const QUESTIONS: Question[] = [
  {
    prompt: "Which task would you happily spend a whole afternoon on?",
    options: [
      { label: "Tracking down a stubborn bug", category: "Software Engineering" },
      { label: "Finding the story inside a messy spreadsheet", category: "Data & AI" },
      { label: "Redrawing a confusing screen until it's obvious", category: "Design" },
      { label: "Talking to people about what they actually need", category: "Public Health" },
    ],
  },
  {
    prompt: "What kind of result makes you proudest?",
    options: [
      { label: "Something that runs reliably for thousands of people", category: "Software Engineering" },
      { label: "A model or analysis that changed a decision", category: "Data & AI" },
      { label: "Work people call beautiful and easy", category: "Design" },
      { label: "A measurable improvement in a community", category: "Sustainability" },
    ],
  },
  {
    prompt: "Pick the working week you'd choose.",
    options: [
      { label: "Deep focus, few meetings", category: "Software Engineering" },
      { label: "Half analysis, half presenting findings", category: "Business & Finance" },
      { label: "Studio work with critique sessions", category: "Design" },
      { label: "Fieldwork with a team", category: "Public Health" },
    ],
  },
  {
    prompt: "Which problem feels most urgent to you?",
    options: [
      { label: "Systems that break under load", category: "Software Engineering" },
      { label: "Decisions made without evidence", category: "Data & AI" },
      { label: "Climate and resource waste", category: "Sustainability" },
      { label: "Unequal access to care", category: "Public Health" },
    ],
  },
  {
    prompt: "How do you prefer to learn something new?",
    options: [
      { label: "Build a small version of it", category: "Software Engineering" },
      { label: "Read the research, then test it", category: "Data & AI" },
      { label: "Sketch and prototype", category: "Design" },
      { label: "Shadow someone experienced", category: "Business & Finance" },
    ],
  },
];

function AptitudeTest() {
  const { data: me } = useMe();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const answer = async (category: string) => {
    const next = [...answers, category];
    setAnswers(next);
    if (step + 1 < QUESTIONS.length) {
      setStep(step + 1);
      return;
    }
    const tally = new Map<string, number>();
    next.forEach((c) => tally.set(c, (tally.get(c) ?? 0) + 1));
    const suggested = Array.from(tally.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);
    setResult(suggested);

    if (me?.user?.id) {
      setBusy(true);
      const { error } = await supabase.from("aptitude_results").insert({
        student_id: me.user.id,
        answers: { picks: next },
        suggested_categories: suggested,
      });
      setBusy(false);
      if (error) toast.error(error.message);
    }
  };

  const applyToPreferences = async () => {
    if (!me?.user?.id || !result) return;
    setBusy(true);
    const { error } = await supabase.from("student_preferences").upsert({
      student_id: me.user.id,
      categories: result,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Preferences updated from your results.");
  };

  if (result) {
    return (
      <AppShell title="Your results" description="Suggested directions based on your answers.">
        <div className="paper-card max-w-xl p-8">
          <h2 className="section-title text-xl">Strongest fits</h2>
          <ol className="mt-4 space-y-2">
            {result.map((category, index) => (
              <li key={category} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <span className="font-display text-accent">0{index + 1}</span>
                <span className="text-sm font-medium">{category}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={applyToPreferences} disabled={busy}>
              Use these as my preferences
            </Button>
            <Button asChild variant="outline">
              <Link to="/app">See matching opportunities</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const question = QUESTIONS[step] ?? QUESTIONS[0]!;

  return (
    <AppShell title="Aptitude test" description="Five questions. It only sharpens your matches.">
      <div className="paper-card max-w-2xl p-8">
        <Progress value={((step + 1) / QUESTIONS.length) * 100} className="h-2" />
        <p className="mt-4 text-xs text-muted-foreground">
          Question {step + 1} of {QUESTIONS.length}
        </p>
        <h2 className="section-title mt-2 text-xl">{question.prompt}</h2>
        <div className="mt-6 space-y-3">
          {question.options.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => answer(option.category)}
              className="w-full rounded-xl border border-border bg-card p-4 text-left text-sm transition-colors hover:border-primary"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
