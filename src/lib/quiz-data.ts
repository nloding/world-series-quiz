import { queryOptions } from "@tanstack/react-query";
import type { SeriesRecord } from "./quiz-store";

export type Team = { name: string; startYear: number; endYear: number | null };

export type SeriesData = {
  series: SeriesRecord[];
};

export type TeamsData = {
  teams: Team[];
};

export type PlayersData = {
  playersByYear: Record<string, string[]>;
};

export const seriesQuery = queryOptions({
  queryKey: ["quiz-data", "series"],
  queryFn: async (): Promise<SeriesData> => {
    const mod = await import("@/data/world_series.json");
    const series = (mod.default as { series: SeriesRecord[] }).series;
    return { series };
  },
  staleTime: Infinity,
});

export const teamsQuery = queryOptions({
  queryKey: ["quiz-data", "teams"],
  queryFn: async (): Promise<TeamsData> => {
    const mod = await import("@/data/teams.json");
    return { teams: (mod.default as unknown as { teams: Team[] }).teams };
  },
  staleTime: Infinity,
});

export const playersQuery = queryOptions({
  queryKey: ["quiz-data", "players"],
  queryFn: async (): Promise<PlayersData> => {
    const mod = await import("@/data/players.json");
    return { playersByYear: mod.default as unknown as Record<string, string[]> };
  },
  staleTime: Infinity,
});
