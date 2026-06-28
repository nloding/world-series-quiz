import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

interface TeamEntry {
  name: string;
  startYear: number;
  endYear: number;
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

const csvPath = resolve(process.cwd(), "scripts/data/teams.csv");
const raw = readFileSync(csvPath, "utf-8");
const lines = raw.split("\n").filter((l) => l.trim() !== "");

const teams: TeamEntry[] = [];

for (let i = 1; i < lines.length; i++) {
  const fields = parseCSVLine(lines[i]);
  // Columns: Rk, Franchise, From, To, ...
  const [rk, franchise, from, to] = fields;

  // Skip rows with empty Rk — these are "Also played as" and "see" redirect rows
  if (!rk || rk.trim() === "") continue;

  const name = franchise.trim();
  const startYear = parseInt(from.trim(), 10);
  const endYear = parseInt(to.trim(), 10);

  teams.push({ name, startYear, endYear });
}

// Merge in historical aliases (team names that appear in world_series.json
// but are listed under a different modern name in teams.csv)
const aliasPath = resolve(process.cwd(), "scripts/data/historical-team-aliases.json");
const aliases = JSON.parse(readFileSync(aliasPath, "utf-8")) as {
  teams: TeamEntry[];
};
for (const alias of aliases.teams) {
  if (!teams.some((t) => t.name === alias.name)) {
    teams.push(alias);
  }
}

teams.sort((a, b) => a.name.localeCompare(b.name));

const output = JSON.stringify({ teams }, null, 2);
writeFileSync(resolve(process.cwd(), "src/data/teams.json"), output, "utf-8");
console.log(`Wrote ${teams.length} team entries to src/data/teams.json`);
