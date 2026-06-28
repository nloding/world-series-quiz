import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

interface SeriesEntry {
  year: number;
  winner: string;
  loser: string;
  numberOfGames: number;
  mvp: string;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// Co-MVP years: the CSV stores multiple names space-concatenated with no delimiter,
// making them impossible to split generically. These are the only two co-MVP awards
// in World Series history and will never change.
const CO_MVPS: Record<number, string> = {
  1981: "Ron Cey, Pedro Guerrero, Steve Yeager",
  2001: "Randy Johnson, Curt Schilling",
};

const csvPath = resolve(process.cwd(), "scripts/data/world-series-data.csv");
const raw = readFileSync(csvPath, "utf-8");
const lines = raw.split("\n").filter((l) => l.trim() !== "");

const series: SeriesEntry[] = [];

for (let i = 1; i < lines.length; i++) {
  const fields = parseCSVLine(lines[i]);
  // Columns: Year, AL Winner, AL Wins, NL Wins, NL Winner, Series MVP
  const [yearStr, alWinner, alWinsStr, nlWinsStr, nlWinner, mvp = ""] = fields;

  const year = parseInt(yearStr, 10);
  if (isNaN(year)) continue; // skip "No World Series held..." rows

  const alWins = parseInt(alWinsStr, 10);
  const nlWins = parseInt(nlWinsStr, 10);
  const numberOfGames = alWins + nlWins;

  const winner = alWins > nlWins ? alWinner : nlWinner;
  const loser = alWins > nlWins ? nlWinner : alWinner;

  series.push({ year, winner, loser, numberOfGames, mvp: CO_MVPS[year] ?? mvp });
}

// Sort most recent first (CSV is already this order, but make it explicit)
series.sort((a, b) => b.year - a.year);

const output = JSON.stringify({ series }, null, 2);
writeFileSync(resolve(process.cwd(), "src/data/world_series.json"), output, "utf-8");
console.log(`Wrote ${series.length} series entries to src/data/world_series.json`);
