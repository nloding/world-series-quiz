import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { playersQuery, seriesQuery, teamsQuery } from "@/lib/quiz-data";
import {
  MVP_FIRST_YEAR,
  activeInYear,
  useQuizStore,
  type Answer,
} from "@/lib/quiz-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { Progress } from "@/components/ui/progress";
import { Combobox } from "@/components/Combobox";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz in Progress — World Series Quiz" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context }) => {
    const config = useQuizStore.getState().config;
    const needPlayers =
      !!config?.askMvp && config.yearRange[1] >= MVP_FIRST_YEAR;
    await Promise.all([
      context.queryClient.ensureQueryData(seriesQuery),
      context.queryClient.ensureQueryData(teamsQuery),
      needPlayers ? context.queryClient.ensureQueryData(playersQuery) : null,
    ]);
  },
  component: QuizPage,
});

const emptyAnswer: Answer = { winner: "", loser: "", numberOfGames: "", mvp: [] };

function QuizPage() {
  const navigate = useNavigate();
  const { config, questions, currentIndex, answers, setAnswer, next } =
    useQuizStore();

  useSuspenseQuery(seriesQuery);
  const { data: teamsData } = useSuspenseQuery(teamsQuery);

  useEffect(() => {
    if (!config || questions.length === 0) {
      navigate({ to: "/" });
    }
  }, [config, questions.length, navigate]);

  const question = questions[currentIndex];
  const mvpAskedThisYear =
    !!config?.askMvp && !!question && question.year >= MVP_FIRST_YEAR;

  const { data: playersData } = useQuery({
    ...playersQuery,
    enabled: mvpAskedThisYear,
  });

  const stored = question ? answers[question.year] : undefined;
  const [draft, setDraft] = useState<Answer>(stored ?? emptyAnswer);

  useEffect(() => {
    setDraft(stored ?? emptyAnswer);
  }, [currentIndex, stored]);

  const teamOptions = useMemo(() => {
    if (!question) return [];
    const names = new Set<string>();
    for (const t of teamsData.teams) {
      if (activeInYear(t, question.year)) names.add(t.name);
    }
    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((n) => ({ value: n, label: n }));
  }, [teamsData.teams, question]);

  const playerOptions = useMemo(() => {
    if (!question || !playersData) return [];
    const names = playersData.playersByYear[String(question.year)] ?? [];
    const lastName = (full: string) => {
      const parts = full.trim().split(/\s+/);
      return parts[parts.length - 1] ?? full;
    };
    return Array.from(new Set(names))
      .sort((a, b) => {
        const cmp = lastName(a).localeCompare(lastName(b));
        return cmp !== 0 ? cmp : a.localeCompare(b);
      })
      .map((n) => ({ value: n, label: n }));
  }, [playersData, question]);

  if (!config || !question) return null;

  const isLast = currentIndex === questions.length - 1;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const canAdvance =
    draft.winner !== "" &&
    (!config.askLoser || draft.loser !== "") &&
    (!config.askGames || draft.numberOfGames !== "") &&
    (!mvpAskedThisYear || draft.mvp.length > 0);

  const handleNext = () => {
    setAnswer(question.year, draft);
    if (isLast) {
      navigate({ to: "/results" });
    } else {
      next();
    }
  };

  return (
    <div className="min-h-screen">
      <header className="bg-mlb-navy text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <div className="font-display text-lg tracking-wide">World Series Quiz</div>
          <div className="text-sm tabular-nums">
            Question {currentIndex + 1} of {questions.length}
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none bg-mlb-navy [&>div]:bg-mlb-red" />
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            World Series
          </div>
          <div className="font-display text-7xl text-mlb-navy sm:text-8xl">
            {question.year}
          </div>
          <div className="mx-auto mt-2 h-1 w-24 bg-mlb-red" />
        </div>

        <Card className="mt-10 space-y-6 p-8">
          <Field label="Winning team">
            <Combobox
              options={teamOptions}
              value={draft.winner}
              onChange={(v) => setDraft({ ...draft, winner: v })}
              placeholder="Pick a team"
            />
          </Field>

          {config.askLoser && (
            <Field label="Losing team">
              <Combobox
                options={teamOptions}
                value={draft.loser}
                onChange={(v) => setDraft({ ...draft, loser: v })}
                placeholder="Pick a team"
              />
            </Field>
          )}

          {config.askGames && (
            <Field label="Number of games">
              <Combobox
                options={[4, 5, 6, 7, 8].map((n) => ({
                  value: String(n),
                  label: String(n),
                }))}
                value={draft.numberOfGames}
                onChange={(v) => setDraft({ ...draft, numberOfGames: v })}
                placeholder="Pick a number"
              />
            </Field>
          )}

          {mvpAskedThisYear && (
            <Field label="Series MVP">
              <Combobox
                multiple
                options={playerOptions}
                values={draft.mvp}
                onValuesChange={(v) => setDraft({ ...draft, mvp: v })}
                placeholder="Pick player(s)"
              />
            </Field>
          )}

          <Button
            onClick={handleNext}
            disabled={!canAdvance}
            className="h-12 w-full bg-mlb-red text-base font-bold uppercase tracking-wider text-white hover:bg-mlb-red/90"
          >
            {isLast ? "See Results" : "Next"}
          </Button>
        </Card>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wider text-mlb-navy">
        {label}
      </Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
