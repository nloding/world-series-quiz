import { readFileSync } from "fs";
import { resolve } from "path";

const wsData = JSON.parse(readFileSync(resolve(process.cwd(), "src/data/world_series.json"), "utf-8"));
const teamsData = JSON.parse(readFileSync(resolve(process.cwd(), "src/data/teams.json"), "utf-8"));
const playersData = JSON.parse(readFileSync(resolve(process.cwd(), "src/data/players.json"), "utf-8"));

const teamNames = new Set<string>(teamsData.teams.map((t: { name: string }) => t.name));
const playersByYear = playersData as Record<string, string[]>;

let conflicts = 0;

// 1. Teams in world_series.json that are missing from teams.json
console.log("=== Team coverage ===");
const missingTeams: { year: number; role: string; team: string }[] = [];

for (const series of wsData.series) {
  if (!teamNames.has(series.winner)) {
    missingTeams.push({ year: series.year, role: "winner", team: series.winner });
  }
  if (!teamNames.has(series.loser)) {
    missingTeams.push({ year: series.year, role: "loser", team: series.loser });
  }
}

if (missingTeams.length === 0) {
  console.log("✓ All World Series teams are present in teams.json");
} else {
  conflicts += missingTeams.length;
  for (const { year, role, team } of missingTeams) {
    console.log(`✗ ${year} ${role}: "${team}" not found in teams.json`);
  }
}

// 2. MVPs in world_series.json that are missing from players.json
console.log("\n=== MVP coverage ===");
const missingMVPs: { year: number; mvp: string }[] = [];

for (const series of wsData.series) {
  if (!series.mvp) continue; // pre-MVP era — skip empty strings

  const yearRoster = new Set(playersByYear[series.year.toString()] ?? []);
  // Co-MVPs are stored as comma-separated names; check each individually.
  const names = series.mvp.split(",").map((n: string) => n.trim());
  for (const name of names) {
    if (!yearRoster.has(name)) {
      missingMVPs.push({ year: series.year, mvp: name });
    }
  }
}

if (missingMVPs.length === 0) {
  console.log("✓ All MVPs are present in players.json");
} else {
  conflicts += missingMVPs.length;
  for (const { year, mvp } of missingMVPs) {
    const isMulti = mvp.split(" ").length > 2;
    const note = isMulti ? " (possible co-MVP — stored as combined string)" : "";
    console.log(`✗ ${year} MVP: "${mvp}" not found in players.json${note}`);
  }
}

// Summary
console.log(`\n${conflicts === 0 ? "✓ No conflicts found." : `✗ ${conflicts} conflict(s) found.`}`);
process.exit(conflicts > 0 ? 1 : 0);
