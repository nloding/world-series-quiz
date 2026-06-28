import { create } from "zustand";

export type QuizConfig = {
  yearRange: [number, number];
  askLoser: boolean;
  askGames: boolean;
  askMvp: boolean;
};

export type SeriesRecord = {
  year: number;
  winner: string;
  loser: string;
  numberOfGames: number;
  mvp: string;
};

export type Answer = {
  winner: string;
  loser: string;
  numberOfGames: string;
  mvp: string[];
};

export function parseMvps(s: string): string[] {
  return s ? s.split(", ") : [];
}

type QuizState = {
  config: QuizConfig | null;
  questions: SeriesRecord[];
  answers: Record<number, Answer>;
  currentIndex: number;
  start: (config: QuizConfig, allSeries: SeriesRecord[]) => void;
  setAnswer: (year: number, answer: Answer) => void;
  next: () => void;
  reset: () => void;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const useQuizStore = create<QuizState>((set) => ({
  config: null,
  questions: [],
  answers: {},
  currentIndex: 0,
  start: (config, allSeries) => {
    const filtered = allSeries.filter(
      (s) => s.year >= config.yearRange[0] && s.year <= config.yearRange[1],
    );
    set({
      config,
      questions: shuffle(filtered),
      answers: {},
      currentIndex: 0,
    });
  },
  setAnswer: (year, answer) =>
    set((state) => ({ answers: { ...state.answers, [year]: answer } })),
  next: () => set((state) => ({ currentIndex: state.currentIndex + 1 })),
  reset: () =>
    set({ config: null, questions: [], answers: {}, currentIndex: 0 }),
}));

export const MVP_FIRST_YEAR = 1955;

export function activeInYear(
  item: { startYear: number; endYear: number | null },
  year: number,
): boolean {
  if (year < item.startYear) return false;
  if (item.endYear !== null && year > item.endYear) return false;
  return true;
}
