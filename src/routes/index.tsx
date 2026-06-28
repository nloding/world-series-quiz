import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { playersQuery, seriesQuery, teamsQuery } from "@/lib/quiz-data";
import { useQuizStore } from "@/lib/quiz-store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  bestPct,
  clearHistory,
  loadHistory,
  type HistoryEntry,
} from "@/lib/history-store";
import { cn } from "@/lib/utils";
import { getRequestOrigin } from "@/lib/origin.functions";
import ogShareUrl from "@/assets/og-share.png";

const DESCRIPTION =
  "Pick a span of years and the categories you want to be quizzed on — winner, loser, games, MVP — for every World Series since 1903.";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const [, origin] = await Promise.all([
      context.queryClient.ensureQueryData(seriesQuery),
      // Only needed at SSR for absolute og:image URL; skip the roundtrip on client nav.
      typeof window === "undefined"
        ? getRequestOrigin().catch(() => "")
        : Promise.resolve(""),
    ]);
    return { origin };
  },
  head: ({ loaderData }) => {
    const origin = loaderData?.origin ?? "";
    const ogImage = `${origin}${ogShareUrl}`;
    return {
      meta: [
        { title: "World Series Quiz — Test your MLB Fall Classic knowledge" },
        { name: "description", content: DESCRIPTION },
        { property: "og:title", content: "World Series Quiz" },
        { property: "og:description", content: DESCRIPTION },
        { property: "og:url", content: "/" },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1216" },
        { property: "og:image:height", content: "640" },
        { name: "twitter:title", content: "World Series Quiz" },
        { name: "twitter:description", content: DESCRIPTION },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: "/" }],
    };
  },
  component: StartPage,
});

const MIN_YEAR = 1903;
const MAX_YEAR = 2025;

function StartPage() {
  const { data: seriesData } = useSuspenseQuery(seriesQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const start = useQuizStore((s) => s.start);

  const [range, setRange] = useState<[number, number]>([MIN_YEAR, MAX_YEAR]);
  const [askLoser, setAskLoser] = useState(true);
  const [askGames, setAskGames] = useState(true);
  const [askMvp, setAskMvp] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loadingStage, setLoadingStage] = useState<
    null | "teams" | "players" | "ready"
  >(null);

  // Load from localStorage after hydration to avoid SSR/client mismatch
  useEffect(() => {
    setHistory(loadHistory());
    // Quietly warm the teams chunk in the background — the common case.
    queryClient.prefetchQuery(teamsQuery);
  }, [queryClient]);

  const count = seriesData.series.filter(
    (s) => s.year >= range[0] && s.year <= range[1],
  ).length;

  const handleStart = async () => {
    if (loadingStage !== null) return;
    // Delay showing the overlay so cached/fast loads don't flash it.
    let overlayShown = false;
    const showOverlay = (stage: "teams" | "players" | "ready") => {
      overlayShown = true;
      setLoadingStage(stage);
    };
    const flashTimer = window.setTimeout(() => showOverlay("teams"), 120);

    try {
      await queryClient.ensureQueryData(teamsQuery);
      const needPlayers = askMvp && range[1] >= 1955;
      if (needPlayers) {
        if (overlayShown) setLoadingStage("players");
        await queryClient.ensureQueryData(playersQuery);
      }
      window.clearTimeout(flashTimer);
      if (overlayShown) setLoadingStage("ready");
      start(
        { yearRange: range, askLoser, askGames, askMvp },
        seriesData.series,
      );
      navigate({ to: "/quiz" });
    } catch (e) {
      window.clearTimeout(flashTimer);
      setLoadingStage(null);
      throw e;
    }
  };

  return (
    <div className="min-h-screen">
      <header className="bg-mlb-navy text-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-mlb-red font-display text-xl">
            ⚾
          </div>
          <div className="font-display text-2xl tracking-wide">World Series Quiz</div>
        </div>
        <div className="h-1 bg-mlb-red" />
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-display text-5xl text-mlb-navy sm:text-6xl">
          The Fall Classic,
          <br />
          tested.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Pick a span of years and the fields you want to be quizzed on.
          The winner is always asked.
        </p>

        <Card className="mt-10 space-y-8 p-8">
          <div>
            <div className="flex items-baseline justify-between">
              <Label className="text-sm font-semibold uppercase tracking-wider text-mlb-navy">
                Year range
              </Label>
              <span className="font-display text-2xl text-mlb-red">
                {range[0]} – {range[1]}
              </span>
            </div>
            <Slider
              className="mt-4"
              min={MIN_YEAR}
              max={MAX_YEAR}
              step={1}
              value={range}
              onValueChange={(v) => setRange([v[0], v[1]] as [number, number])}
            />
            <p className="mt-2 text-sm text-muted-foreground">
              {count} {count === 1 ? "World Series" : "World Series"} in this range.
            </p>
          </div>

          <div>
            <Label className="text-sm font-semibold uppercase tracking-wider text-mlb-navy">
              Also quiz me on
            </Label>
            <div className="mt-3 space-y-3">
              <FieldToggle
                id="loser"
                label="Losing team"
                checked={askLoser}
                onChange={setAskLoser}
              />
              <FieldToggle
                id="games"
                label="Number of games"
                checked={askGames}
                onChange={setAskGames}
              />
              <FieldToggle
                id="mvp"
                label="World Series MVP"
                hint="First awarded in 1955 — not scored for earlier years"
                checked={askMvp}
                onChange={setAskMvp}
              />
            </div>
          </div>

          <Button
            onClick={handleStart}
            disabled={count === 0 || loadingStage !== null}
            className="h-14 w-full bg-mlb-red text-base font-bold uppercase tracking-wider text-white hover:bg-mlb-red/90"
          >
            Play Ball
          </Button>
        </Card>

        {loadingStage !== null && <LoadingOverlay stage={loadingStage} />}

        {history.length > 0 && (
          <HistoryPanel
            history={history}
            showAll={showAll}
            onToggleShowAll={() => setShowAll((v) => !v)}
            onClear={() => {
              if (window.confirm("Clear all previous results?")) {
                clearHistory();
                setHistory([]);
                setShowAll(false);
              }
            }}
          />
        )}
      </main>
    </div>
  );
}

function HistoryPanel({
  history,
  showAll,
  onToggleShowAll,
  onClear,
}: {
  history: HistoryEntry[];
  showAll: boolean;
  onToggleShowAll: () => void;
  onClear: () => void;
}) {
  const best = bestPct(history);
  const visible = showAll ? history : history.slice(0, 5);
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-mlb-navy">
          Recent attempts
        </h2>
        <span className="text-xs text-muted-foreground">
          {history.length} {history.length === 1 ? "attempt" : "attempts"}
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <ul className="divide-y divide-border">
          {visible.map((h) => (
            <HistoryRow key={h.id} entry={h} isBest={best === h.overall.pct} />
          ))}
        </ul>
        {(history.length > 5 || history.length > 0) && (
          <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2 text-xs">
            {history.length > 5 ? (
              <button
                onClick={onToggleShowAll}
                className="font-semibold uppercase tracking-wider text-mlb-navy hover:text-mlb-red"
              >
                {showAll ? "Show less" : `Show all (${history.length})`}
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={onClear}
              className="text-muted-foreground hover:text-mlb-red"
            >
              Clear history
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function pctColor(pct: number): { background: string; color: string } {
  const clamped = Math.max(0, Math.min(100, pct));
  const hue = Math.round((clamped / 100) * 120); // 0 red → 60 yellow → 120 green
  // Yellow (~40–80) is too light for white text — use near-black instead.
  const color = hue >= 40 && hue <= 80 ? "#1a1a1a" : "white";
  return { background: `hsl(${hue} 70% 45%)`, color };
}

const FIELD_LABELS: Record<"W" | "L" | "G" | "M", string> = {
  W: "Winning team",
  L: "Losing team",
  G: "Number of games",
  M: "Series MVP",
};

function fieldPct(stat: { correct: number; total: number } | undefined) {
  if (!stat || stat.total === 0) return null;
  return Math.round((stat.correct / stat.total) * 100);
}

function HistoryRow({ entry, isBest }: { entry: HistoryEntry; isBest: boolean }) {
  const { yearRange, totalQuestions, fields, overall } = entry;
  const chips: { letter: "W" | "L" | "G" | "M"; pct: number }[] = [];
  const w = fieldPct(fields.winner);
  if (w !== null) chips.push({ letter: "W", pct: w });
  const l = fieldPct(fields.loser);
  if (l !== null) chips.push({ letter: "L", pct: l });
  const g = fieldPct(fields.numberOfGames);
  if (g !== null) chips.push({ letter: "G", pct: g });
  const m = fieldPct(fields.mvp);
  if (m !== null) chips.push({ letter: "M", pct: m });

  const pctTone =
    overall.pct >= 80
      ? "text-success"
      : overall.pct >= 50
        ? "text-mlb-navy"
        : "text-muted-foreground";

  return (
    <li
      className="flex items-center gap-4 px-4 py-3"
      aria-label={`${yearRange[0]} to ${yearRange[1]}, ${totalQuestions} series, ${overall.pct}% overall`}
    >
      <div className="font-display text-lg text-mlb-navy whitespace-nowrap">
        {yearRange[0]} – {yearRange[1]}
      </div>
      <ul role="list" className="flex gap-1">
        {chips.map((c) => (
          <li
            key={c.letter}
            role="listitem"
            style={pctColor(c.pct)}
            className="flex h-10 w-10 flex-col items-center justify-center rounded-sm leading-none"
            aria-label={`${FIELD_LABELS[c.letter]}: ${c.pct}% correct`}
            title={`${FIELD_LABELS[c.letter]}: ${c.pct}%`}
          >
            <span aria-hidden="true" className="text-[11px] font-bold">{c.letter}</span>
            <span aria-hidden="true" className="mt-0.5 text-[9px] font-semibold opacity-90">
              {c.pct}%
            </span>
          </li>
        ))}
      </ul>
      <div className="ml-auto flex items-center gap-2">
        {isBest && (
          <span className="rounded-full bg-mlb-red/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mlb-red">
            Best
          </span>
        )}
        <span className={cn("font-display text-xl", pctTone)}>
          {overall.pct}%
        </span>
      </div>
    </li>
  );
}

function FieldToggle({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-background px-4 py-3 transition-colors hover:border-mlb-red"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
      />
      <span className="flex-1">
        <span className="font-medium">{label}</span>
        {hint && (
          <span className="block text-xs text-muted-foreground">{hint}</span>
        )}
      </span>
    </label>
  );
}

function LoadingOverlay({ stage }: { stage: "teams" | "players" | "ready" }) {
  const label =
    stage === "teams"
      ? "Loading teams…"
      : stage === "players"
        ? "Loading players…"
        : "Warming up…";
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-mlb-navy/85 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-4 rounded-lg bg-white px-10 py-8 shadow-2xl">
        <div className="flex h-14 w-14 animate-spin items-center justify-center rounded-full border-4 border-mlb-navy/20 border-t-mlb-red text-2xl">
          <span className="-mt-0.5" aria-hidden="true">⚾</span>
        </div>
        <div className="font-display text-lg tracking-wide text-mlb-navy">
          {label}
        </div>
      </div>
    </div>
  );
}
