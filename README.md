![World Series Quiz: Test your knowledge of every fall classic](/src/assets/og-share.png)

A quiz covering every World Series from 1903 to today.

**https://www.worldseriesquiz.com/**

## Prerequisites

- Node.js 20+ (or [Bun](https://bun.sh) 1.1+)
- A [Cloudflare](https://dash.cloudflare.com/) account if you want to deploy

## Local development

```bash
npm install
npm run dev
```

The dev server runs at <http://localhost:8080>.

Bun also works: `bun install && bun run dev`.

## Production build

```bash
npm run build
```

Output is written to `dist/` using Nitro's `cloudflare-module` preset:

- `dist/server/index.mjs` — the SSR Worker entry
- `dist/client/` — static assets served by the Worker's asset binding

## Deploy to Cloudflare Workers

1. Install Wrangler globally or use the bundled devDependency: `npx wrangler login`
2. Build and deploy:

   ```bash
   npm run deploy
   ```

`wrangler.toml` is preconfigured for the `nodejs_compat` flag and an `ASSETS` binding pointing at `dist/client`.

To run the built Worker locally against the Cloudflare runtime:

```bash
npm run cf:dev
```

## Project layout

```
src/
  routes/           # File-based TanStack Router routes (/, /quiz, /results)
  components/       # shadcn/ui components + Combobox
  lib/              # Zustand store, TanStack Query data, utilities
  data/*.json       # World Series, teams, players — imported at build time
  server.ts         # SSR Worker entry (wraps the framework handler)
  start.ts          # TanStack Start middleware registration
public/data/*.json  # Hot-swappable copies of the JSON data
```

The quiz data is bundled at build time from `src/data/`. To swap it, edit those files and rebuild. Everything is documented in the `scripts` folder.
