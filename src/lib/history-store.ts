export type FieldStat = { correct: number; total: number };

export type HistoryEntry = {
  id: string;
  completedAt: number;
  yearRange: [number, number];
  totalQuestions: number;
  fields: {
    winner: FieldStat;
    loser?: FieldStat;
    numberOfGames?: FieldStat;
    mvp?: FieldStat;
  };
  overall: { correct: number; total: number; pct: number };
};

const KEY = "ws-quiz-history";
const MAX = 50;

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveAttempt(
  entry: Omit<HistoryEntry, "id" | "completedAt">,
): HistoryEntry {
  const full: HistoryEntry = {
    ...entry,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    completedAt: Date.now(),
  };
  try {
    const next = [full, ...loadHistory()].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore quota / serialization errors
  }
  return full;
}

export function clearHistory(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function bestPct(history: HistoryEntry[]): number | null {
  if (history.length === 0) return null;
  return history.reduce((m, h) => (h.overall.pct > m ? h.overall.pct : m), 0);
}
