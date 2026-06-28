# How to find player data

All World Series can be found in the following URL format:

`https://www.baseball-almanac.com/ws/yr####ws.shtml`

Where `####` is the four digit year. For example:
- 2024 World Series: https://www.baseball-almanac.com/ws/yr2024ws.shtml
- 1903 World Series: https://www.baseball-almanac.com/ws/yr1903ws.shtml
- 1984 World Series: https://www.baseball-almanac.com/ws/yr1984ws.shtml

Each page should have four tables we want to parse, which contain the player and pitcher
rosters for both teams. Unfortunately, they don't have ID's, names, or any unique data
or class we can select. It is the first two tables where `table > tbody > tr[1] > td > p`
text contains "Composite Hitting Statistics", and the same relative xpath where the text
contains "Composite Pitching Statistics". i believe an xpath selector would look like:

`//table[.//tbody/tr[1]/td/p[contains(., 'Composite Hitting Statistics')]]`
and
`//table[.//tbody/tr[1]/td/p[contains(., 'Composite Pitching Statistics')]]`

Those will both return a single table, which represents both teams. The order of the teams
is the same as the order of the team names in the `h2` of this xpath selector:
`/html/body/div[2]/div[2]/div[1]/h2`. That heading is itself multiple elements. The
format is "Team Name 1" followed by a number in parentheses, then "vs", "Team Name 2" followed by a number in parentheses, and then more text. Parsing the two team names from that
should match either the winning or losing team name in `world_series.json`.

In these larger tables, there are rows that represent player statistics, and we are
only interested in the names of the players. The tables are formatted very strangely.
There will be two rows where the first `td` has a class "header". Two rows below that,
the first `td` cell contains a list of player names. Each player name is wrapped in an
anchor (`a`) tag, each `a` separated by a `br`. The first list of player names is the first
name found in the page h2 header as described earlier; the second list of players is the 
second team name found there.

This ultimately gives us two pairs of the player names, two lists for each team. The
lists should be merged into one list for each team, and that data used to populate the
`players.json` file. The schema/shape of that data is described in the ./world-series-quiz.schema.md file