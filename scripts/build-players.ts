import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import * as cheerio from "cheerio";

interface SeriesEntry {
  year: number;
  winner: string;
  loser: string;
}

const DELAY_MS = 1500;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url: string, attempt = 1): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) {
      console.warn(`  HTTP ${res.status} for ${url}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    if (attempt < 2) {
      console.warn(`  Fetch error, retrying in 3s...`);
      await sleep(3000);
      return fetchPage(url, attempt + 1);
    }
    console.warn(`  Failed after retry: ${err}`);
    return null;
  }
}

// Return the canonical team name from wsWinner/wsLoser if extracted name is a close match
// (handles website typos like "Pittsburgh Pirate" vs "Pittsburgh Pirates").
function normalizeTeam(name: string, candidates: [string, string]): string {
  if (candidates.includes(name)) return name;
  for (const c of candidates) {
    if (c.startsWith(name) || name.startsWith(c)) return c;
  }
  return name;
}

function extractPlayersFromPage(
  html: string,
  year: number,
  wsWinner: string,
  wsLoser: string
): Map<string, string[]> {
  const $ = cheerio.load(html);
  const teamPlayers = new Map<string, string[]>();
  const knownTeams: [string, string] = [wsWinner, wsLoser];

  // Find the matchup order from the page title (e.g. "Pittsburgh Pirates (4) vs Detroit Tigers (3)").
  // Some pages put navigation before the team names: "← 1977 | Team1 (N) vs Team2 (N) | 1979 →"
  // Split on "|" and take everything after the first "|" to strip the navigation prefix.
  let pageTeam1: string | null = null;
  let pageTeam2: string | null = null;
  $("td.header p").each((_, p) => {
    if (pageTeam1) return; // already found
    const raw = $(p).text().trim();
    // Strip "← YEAR |" navigation prefix if present
    const text = raw.includes("|") ? raw.split("|").slice(1).join("|").trim() : raw;
    const m = text.match(/^(.+?)\s*\(\d+\)\s+vs\s+(.+?)\s*\(\d+\)/i);
    if (m) {
      pageTeam1 = normalizeTeam(m[1].trim(), knownTeams);
      pageTeam2 = normalizeTeam(m[2].trim(), knownTeams);
    }
  });

  // Separate counters per stat type: even index = team1, odd = team2
  let hittingSection = 0;
  let pitchingSection = 0;

  $("td.header").each((_, headerTd) => {
    const pEl = $(headerTd).find("p");
    // Normalize internal whitespace to handle "Composite  Pitching Statistics" (double space on some pages)
    const pText = pEl.text().trim().replace(/\s+/g, " ");

    const isHitting = pText.includes("Composite Hitting Statistics");
    const isPitching = pText.includes("Composite Pitching Statistics");
    if (!isHitting && !isPitching) return;

    const sectionIdx = isHitting ? hittingSection++ : pitchingSection++;
    const isFirstTeam = sectionIdx % 2 === 0;

    // Try to extract team name from the p text itself.
    // Format: "Team Name YEAR World Series Composite Hitting/Pitching Statistics"
    // Some pages have year typos (e.g. "209" for 2009), so match 3-4 digits.
    let teamName = pText
      .replace(/\s*\d{3,4}\s+World Series Composite.*/, "")
      .trim();

    // If extraction left the raw stats title (no team prefix), fall back to page/ws ordering
    if (
      !teamName ||
      teamName === "Composite Hitting Statistics" ||
      teamName === "Composite Pitching Statistics"
    ) {
      if (pageTeam1 && pageTeam2) {
        teamName = isFirstTeam ? pageTeam1 : pageTeam2;
      } else {
        // Last resort: use world_series.json winner/loser order
        teamName = isFirstTeam ? wsWinner : wsLoser;
      }
    }

    // Normalize against known teams to fix website typos (e.g. "Pittsburgh Pirate" → "Pittsburgh Pirates")
    teamName = normalizeTeam(teamName, knownTeams);

    if (!teamName) return;

    // Walk sibling rows to collect all player links until the next stats section header.
    // Player links always point to player.php, regardless of which CSS class the td uses.
    let row = $(headerTd).parent().next();
    const players: string[] = [];

    while (row.length > 0) {
      // Any td.header signals the start of the next section — stop here.
      if (row.find("td.header").length > 0) break;

      row.find('a[href*="player.php"]').each((_, a) => {
        const name = $(a).text().trim();
        if (name) players.push(name);
      });

      row = row.next();
    }

    if (!teamPlayers.has(teamName)) teamPlayers.set(teamName, []);
    const existing = teamPlayers.get(teamName)!;
    for (const name of players) {
      if (!existing.includes(name)) existing.push(name);
    }
  });

  return teamPlayers;
}

function loadNameCorrections(): Map<string, string> {
  const csvPath = resolve(process.cwd(), "scripts/data/player-name-corrections.csv");
  const lines = readFileSync(csvPath, "utf-8").split("\n").filter((l) => l.trim() !== "");
  const map = new Map<string, string>();
  for (let i = 1; i < lines.length; i++) {
    const commaIdx = lines[i].indexOf(",");
    if (commaIdx === -1) continue;
    const ascii = lines[i].slice(0, commaIdx).trim();
    const correct = lines[i].slice(commaIdx + 1).trim();
    if (ascii && correct) map.set(ascii, correct);
  }
  return map;
}

async function main() {
  const corrections = loadNameCorrections();
  console.log(`Loaded ${corrections.size} name correction(s)`);

  const wsPath = resolve(process.cwd(), "src/data/world_series.json");
  const wsData = JSON.parse(readFileSync(wsPath, "utf-8")) as {
    series: SeriesEntry[];
  };

  const seriesByYear = new Map(wsData.series.map((s) => [s.year, s]));
  const years = [...seriesByYear.keys()].sort((a, b) => a - b);

  console.log(
    `Processing ${years.length} years (${years[0]}–${years[years.length - 1]})`
  );

  const output: Record<string, string[]> = {};

  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const entry = seriesByYear.get(year)!;
    const url = `https://www.baseball-almanac.com/ws/yr${year}ws.shtml`;

    if (i > 0) await sleep(DELAY_MS);

    const html = await fetchPage(url);
    if (!html) {
      console.warn(`  Skipping ${year} due to fetch failure`);
      continue;
    }

    const teamPlayers = extractPlayersFromPage(
      html,
      year,
      entry.winner,
      entry.loser
    );

    if (teamPlayers.size === 0) {
      console.warn(`  ${year}: no composite stats tables found`);
      continue;
    }

    const allPlayers = new Set<string>();
    const summary: string[] = [];
    for (const [team, playerList] of teamPlayers) {
      summary.push(`${team} (${playerList.length})`);
      for (const rawName of playerList) {
        allPlayers.add(corrections.get(rawName) ?? rawName);
      }
    }

    output[year.toString()] = [...allPlayers].sort((a, b) => {
      const lastA = a.split(" ").pop()!;
      const lastB = b.split(" ").pop()!;
      return lastA.localeCompare(lastB);
    });

    console.log(`  ${year}: ${summary.join(", ")} → ${allPlayers.size} unique players`);
  }

  writeFileSync(resolve(process.cwd(), "src/data/players.json"), JSON.stringify(output, null, 2), "utf-8");
  const totalYears = Object.keys(output).length;
  const totalPlayers = Object.values(output).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`\nWrote ${totalYears} years, ${totalPlayers} total player-year entries to src/data/players.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
