# World Series Quiz Data

"Data pipeline" scripts that build the JSON data files consumed by the World Series Quiz app.

## Data Sources

`./data/teams.csv` and `./data/world-series-data.csv` were exported from https://www.baseball-reference.com/teams/ and https://www.baseball-reference.com/postseason/world-series.shtml respectively. The scripts simply transform them into JSON.

`./players.md` describes how the players file is sourced and built.

`./data/historical-team-aliases.json` and `./data/player-name-corrections.csv` are generated from testing against these data sources and identifying gaps. These are used to ensure that a handful of team aliases that appear in the World Series data set but not directly in the teams.csv are added into the final output. The player name corrections fix diacritics/accents on some player names to ensure matches.

## Output Files

All scripts write to `src/data/`:

| File | Description |
|------|-------------|
| `src/data/world_series.json` | All World Series results (1903–2025), winner, loser, games played, MVP |
| `src/data/teams.json` | All professional baseball franchises (MLB + Negro Leagues) with active year ranges |
| `src/data/players.json` | All players on World Series rosters, by year |

## Setup

Ensure that you have run `npm install` in the parent directory.

## Scripts

All scripts should be run from the parent directory.

### `npm run build:world-series`

Reads `scripts/data/world-series-data.csv` and writes `src/data/world_series.json`.

The winner is determined by which team had more wins. Years with no World Series (1904, 1994) are skipped automatically. Co-MVPs (e.g. Randy Johnson and Curt Schilling in 2001) are stored as a single string.

### `npm run build:teams`

Reads `scripts/data/teams.csv` and `scripts/data/historical-team-aliases.json`, writes `src/data/teams.json`.

Rows with an empty rank column (redirect rows like "Anaheim Angels see Los Angeles Angels" and "Also played as..." notes) are filtered out. The result includes ~160 franchises across MLB and the Negro Leagues.

### `npm run build:players`

Scrapes [baseball-almanac.com](https://www.baseball-almanac.com) and writes `src/data/players.json`.

Fetches the composite hitting and pitching statistics page for each World Series year. Extracts the 25–28 man roster for each team and deduplicates by `(player, team)` pair — so a player who appeared in multiple World Series with the same team is listed once, but a player who appeared with two different teams gets two entries.

This script makes ~121 HTTP requests with a 1.5-second delay between each. **Expect it to take about 3 minutes to complete.**

Years are sourced from `src/data/world_series.json`, so run `build:world-series` first if that file doesn't exist.

### `npm run validate`

Reads the three JSON files from `src/data/` and checks that every team referenced in `world_series.json` exists in `teams.json`, and every MVP exists in `players.json`. Exits with code 1 if any conflicts are found.

## Data Schema

```json
// teams.json
{
	"teams": [
		{
			"name": "Team Name",
			"startYear": 1890,
			"endYear": 1957
		},
		{
			"name": "Team Name",
			"startYear": 1890,
			"endYear": 1957
		}
	]
}

// players.json
{
	1903: [
		"Player Name",
		"Player Name",
	],
	1904: [
		"Player Name",
		"Player Name",
	]
}

// world_series.json
{
	"series": [
		{
			"year": 1903,
			"winner": "Team One",
			"loser": "Team Two",
			"numberOfGames": 6,
			"mvp": "Player Name"
		},
		{
			"year": 1903,
			"winner": "Team One",
			"loser": "Team Two",
			"numberOfGames": 6,
			"mvp": "Comma, Separated, Names"
		}
	]
}
```
