import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MVP_FIRST_YEAR, parseMvps, useQuizStore, type Answer, type SeriesRecord } from "@/lib/quiz-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { bestPct, loadHistory, saveAttempt, type FieldStat } from "@/lib/history-store";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Your Results — World Series Quiz" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const navigate = useNavigate();
  const { config, questions, answers, reset } = useQuizStore();
  const savedRef = useRef(false);
  const [previousBest, setPreviousBest] = useState<number | null>(null);

  useEffect(() => {
    if (!config || questions.length === 0) navigate({ to: "/" });
  }, [config, questions.length, navigate]);

  const computed = (() => {
    if (!config || questions.length === 0) return null;
    let totalFields = 0;
    let correctFields = 0;
    const perField = {
      winner: { c: 0, t: 0 },
      loser: { c: 0, t: 0 },
      numberOfGames: { c: 0, t: 0 },
      mvp: { c: 0, t: 0 },
    };
    for (const q of questions) {
      const a = answers[q.year];
      const askedFields: ("winner" | "loser" | "numberOfGames" | "mvp")[] = ["winner"];
      if (config.askLoser) askedFields.push("loser");
      if (config.askGames) askedFields.push("numberOfGames");
      if (config.askMvp && q.year >= MVP_FIRST_YEAR) askedFields.push("mvp");
      for (const f of askedFields) {
        totalFields++;
        perField[f].t++;
        const correct = checkField(f, q, a);
        if (correct) {
          correctFields++;
          perField[f].c++;
        }
      }
    }
    const pct = totalFields === 0 ? 0 : Math.round((correctFields / totalFields) * 100);
    return { totalFields, correctFields, perField, pct };
  })();

  useEffect(() => {
    if (savedRef.current) return;
    if (!config || questions.length === 0 || !computed) return;
    savedRef.current = true;
    const prior = loadHistory();
    setPreviousBest(bestPct(prior));
    const toStat = (s: { c: number; t: number }): FieldStat => ({
      correct: s.c,
      total: s.t,
    });
    saveAttempt({
      yearRange: config.yearRange,
      totalQuestions: questions.length,
      fields: {
        winner: toStat(computed.perField.winner),
        ...(config.askLoser ? { loser: toStat(computed.perField.loser) } : {}),
        ...(config.askGames
          ? { numberOfGames: toStat(computed.perField.numberOfGames) }
          : {}),
        ...(config.askMvp && computed.perField.mvp.t > 0
          ? { mvp: toStat(computed.perField.mvp) }
          : {}),
      },
      overall: { correct: computed.correctFields, total: computed.totalFields, pct: computed.pct },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed !== null]);

  if (!config || questions.length === 0 || !computed) return null;

  const sorted = [...questions].sort((a, b) => a.year - b.year);
  const { totalFields, correctFields, perField, pct } = computed;

  const bestBanner = (() => {
    if (previousBest === null)
      return { label: "First attempt", tone: "muted" as const };
    if (pct > previousBest)
      return {
        label: `New best — up from ${previousBest}%`,
        tone: "accent" as const,
      };
    if (pct === previousBest)
      return { label: "Matches your best", tone: "navy" as const };
    return { label: `Your best: ${previousBest}%`, tone: "muted" as const };
  })();

  const handlePlayAgain = () => {
    reset();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen">
      <header className="bg-mlb-navy text-white">
        <div className="mx-auto max-w-4xl px-6 py-4 font-display text-2xl tracking-wide">
          World Series Quiz
        </div>
        <div className="h-1 bg-mlb-red" />
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Your Accuracy
          </div>
          <div className="font-display text-8xl text-mlb-navy sm:text-9xl">
            {pct}%
          </div>
          <div className="mx-auto mt-2 h-1 w-24 bg-mlb-red" />
          <div className="mt-4 text-muted-foreground">
            {correctFields} of {totalFields} correct
          </div>
          <div className="mt-4 flex justify-center">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider",
                bestBanner.tone === "accent" &&
                  "bg-mlb-red text-white",
                bestBanner.tone === "navy" &&
                  "bg-mlb-navy text-white",
                bestBanner.tone === "muted" &&
                  "bg-muted text-muted-foreground",
              )}
            >
              <Trophy className="h-3.5 w-3.5" />
              {bestBanner.label}
            </span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Winner" data={perField.winner} />
          {config.askLoser && <Stat label="Loser" data={perField.loser} />}
          {config.askGames && <Stat label="Games" data={perField.numberOfGames} />}
          {config.askMvp && perField.mvp.t > 0 && <Stat label="MVP" data={perField.mvp} />}
        </div>

        <div className="mt-10 space-y-4">
          {sorted.map((q) => {
            const a = answers[q.year];
            return (
              <Card key={q.year} className="overflow-hidden p-0">
                <div className="flex items-center gap-4 border-b border-border bg-mlb-navy/5 px-6 py-3">
                  <div className="font-display text-3xl text-mlb-navy">{q.year}</div>
                </div>
                <div className="divide-y divide-border">
                  <Row label="Winner" user={a?.winner} correct={q.winner} />
                  {config.askLoser && (
                    <Row label="Loser" user={a?.loser} correct={q.loser} />
                  )}
                  {config.askGames && (
                    <Row
                      label="Games"
                      user={a?.numberOfGames}
                      correct={String(q.numberOfGames)}
                    />
                  )}
                  {config.askMvp && q.year >= MVP_FIRST_YEAR && (
                    <Row
                      label="MVP"
                      user={a?.mvp ? a.mvp.join(", ") : ""}
                      correct={q.mvp || "—"}
                      isCorrect={mvpEqual(a?.mvp ?? [], parseMvps(q.mvp))}
                    />
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        <Button
          onClick={handlePlayAgain}
          className="mt-10 h-14 w-full bg-mlb-red text-base font-bold uppercase tracking-wider text-white hover:bg-mlb-red/90"
        >
          Play Again
        </Button>
      </main>
    </div>
  );
}

function Stat({ label, data }: { label: string; data: { c: number; t: number } }) {
  const pct = data.t === 0 ? 0 : Math.round((data.c / data.t) * 100);
  return (
    <Card className="p-4 text-center">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="font-display text-3xl text-mlb-navy">{pct}%</div>
      <div className="text-xs text-muted-foreground">
        {data.c}/{data.t}
      </div>
    </Card>
  );
}

function Row({
  label,
  user,
  correct,
  isCorrect: isCorrectProp,
}: {
  label: string;
  user: string | undefined;
  correct: string;
  isCorrect?: boolean;
}) {
  const userVal = user ?? "";
  const isCorrect =
    isCorrectProp ?? normalize(userVal) === normalize(correct);
  return (
    <div
      className={cn(
        "grid grid-cols-[80px_1fr_auto] items-center gap-3 px-6 py-3 text-sm",
        isCorrect ? "bg-success/5" : "bg-destructive/5",
      )}
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div>
        <div className={cn(isCorrect ? "text-foreground" : "text-destructive line-through")}>
          {userVal || <span className="text-muted-foreground">— no answer —</span>}
        </div>
        {!isCorrect && (
          <div className="font-medium text-foreground">{correct}</div>
        )}
      </div>
      {isCorrect ? (
        <Check className="h-5 w-5 text-success" />
      ) : (
        <X className="h-5 w-5 text-destructive" />
      )}
    </div>
  );
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function mvpEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const an = a.map(normalize).sort();
  const bn = b.map(normalize).sort();
  return an.every((v, i) => v === bn[i]);
}

function checkField(
  f: "winner" | "loser" | "numberOfGames" | "mvp",
  q: SeriesRecord,
  a: Answer | undefined,
) {
  if (!a) return false;
  if (f === "numberOfGames") return parseInt(a.numberOfGames, 10) === q.numberOfGames;
  if (f === "mvp") return mvpEqual(a.mvp, parseMvps(q.mvp));
  return normalize(a[f]) === normalize(q[f]);
}
