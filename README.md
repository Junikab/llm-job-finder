# Jora LLM Job Finder (Mock Mode)

A small monorepo that uploads a CV, builds Jora search queries, scrapes job ads, and returns a ranked list. Default scoring is random for fast local dev, with optional LLM scoring.

- Server: Fastify (TypeScript)
- Web: React + Vite
- Scraper: Playwright + Cheerio (in `packages/scraper`)


## Quick start

- Install deps: `npm install`
- Dev (API + Web): `npm run dev`
- Open the app: http://localhost:5173
- Healthcheck: `curl -sf http://localhost:5174/health`
- Use it: upload a CV (PDF/DOCX/TXT), set location/days, click Find Jobs

## Publish web app on GitHub Pages (free)

This repo has a monorepo setup. GitHub Pages can host the web UI only (`apps/web`), not the API/scraper.

### Before first push (privacy + safety)

- Do not commit `.env` (already ignored in `.gitignore`).
- Do not commit local DB files (`db/`) (already ignored in `.gitignore`).
- Keep API keys only in deployment platform secrets/variables, never in code.

Quick safety check:
```bash
git ls-files .env db out.json
```
This should print nothing.

### One-time setup on GitHub

1. Create a new GitHub repo (for example `LLm-job-finder`) under your account.
2. Push this project to that repo:
```bash
git remote add origin git@github.com:Junikab/LLm-job-finder.git
git push -u origin main
```
3. In GitHub repo settings:
   - Go to `Settings` -> `Pages`.
   - Set `Source` to `GitHub Actions`.
4. Optional but recommended: add repository variable:
   - `Settings` -> `Secrets and variables` -> `Actions` -> `Variables`.
   - Add `VITE_API_BASE_URL` (example: `https://your-api-host.com`).

### Deploy

- Push to `main`.
- Workflow `.github/workflows/deploy-pages.yml` builds and deploys `apps/web/dist`.
- Site URL will be:
  `https://junikab.github.io/LLm-job-finder/`

### Important limitation

The web app calls `/api/...`. For full functionality, deploy `apps/server` separately (free backend host) and set `VITE_API_BASE_URL` to that backend URL.

## Scripts

- Dev (API + Web): `npm run dev`
- Build all: `npm run build`
- API only (watch): `npm --workspace apps/server run dev`
- Web only (dev): `npm --workspace apps/web run dev`
- Web preview (built): `npm --workspace apps/web run preview`

## Repository layout
- `apps/server/` — Fastify API
- `apps/web/` — React web app
- `packages/scraper/` — Jora scraper used by the API
- `packages/shared-types/` — Shared type definitions (`CVAnalysis`, `JobItem`, `RankedJob`, `SavedJob`) consumed by server and web
- `PLAN.md` / `DESIGN.md` — project docs

## Web styles

- About page CSS is split for clarity and isolation:
  - `apps/web/src/styles/about/hero.css` — layout, hero, CTA, mobile tweaks
  - `apps/web/src/styles/about/steps.css` — "How it works" section (wavy full-bleed bg, steps)
  - `apps/web/src/styles/about/lists.css` — two-column lists and footer
- Saved page styles are self-contained in `apps/web/src/styles/SavedPage.css` and do not reuse About classes.
- Prefer page-scoped class names (e.g., `aboutPage__*`, `saved*`) to prevent cross-page style bleed.

## Architecture

See DESIGN.md for the full architecture, data flow, and component structure.

## Prerequisites
- Node.js 18+
- npm 9+


## Setup
1) Install dependencies (root):
```
npm install
```

2) Create a local env file (root):
```
cp .env.example .env
```
You can keep the defaults. `OPENAI_API_KEY` is not needed for mock mode.
This project uses one local env source only: root `.env` (do not use `apps/server/.env`).


## Run (dev)
Start API and Web together (root):
```
npm run dev
```
- API: http://localhost:5174 (from `.env` `PORT`)
- Web: http://localhost:5173 (Vite dev server)
- Proxy: Web forwards `/api/*` to `5174` (see `apps/web/package.json`)

Use the app at http://localhost:5173
- Upload a CV (PDF/DOCX/TXT, max 5MB)
- Choose Location and Listed within
- Click Find Jobs → see analysis, query URL(s), and ranked results
- Saved tab lets you refresh and rate jobs (feedback stored on disk only when enabled, see below)


## How it works (high level)
1) Upload CV → server extracts text → builds Jora search URLs.
2) Scraper collects jobs → pre-sort → score (random by default; LLM optional) → return ranked results.
Full details in DESIGN.md.

## API (dev)
- POST /api/jobs/find — upload CV; returns analysis, searchUrls, results.
- POST /api/jobs/rescore — rescore current jobs using edited analysis (optional refreshSearch).
- GET /api/db/jobs — list merged jobs from snapshots.
- POST /api/db/feedback — store a user rating.
- GET /api/profiles, GET /api/profiles/:id, POST /api/profiles — save/load profiles.
Full request/response details are in DESIGN.md (API section).

## cURL examples

- Healthcheck:
  curl -sf http://localhost:5174/health | jq
  # remove '| jq' if you don't have jq installed

- Find jobs (PDF/DOCX/TXT upload):
  curl -X POST http://localhost:5174/api/jobs/find \
    -F "cv=@/absolute/path/to/your-cv.pdf" \
    -F "location=Sydney NSW" \
    -F "days=7" | jq '.total, .searchUrls, .results[0]'

More examples are in DESIGN.md.

## Environment variables
Use .env.example as your reference. For explanations and defaults, see DESIGN.md (Configuration & LLM sections).

Local env source of truth:
- The API explicitly loads root `.env` from `apps/server/src/index.ts`.
- Keep secrets in root `.env` for local development only.
- Do not create `apps/server/.env` (it is not used).
- After changing `.env`, restart the API process.

## Scoring modes
Default: random (see `.env.example`).

- **random**: returns a random 0–100 score with reason `random`.
- **llm**: enable LLM per-job scoring with `SCORE_MODE=llm`. Concurrency is limited by `LLM_CONCURRENCY`; each call times out per `LLM_TIMEOUT_MS`. On error or parse failure, the server falls back to random and annotates the reason (e.g., `random; llm-error: timeout`). Requires `OPENAI_API_KEY` (and `OPENAI_MODEL`, defaults to `gpt-4o-mini`).

Note: The server uses a lightweight pre-sort (`preSortByKeywordSignals`) based on simple title/skill keyword matches before scoring. This pre-sort is not a scoring mode; it only helps choose which jobs to score first.

Note on configuration:
- To use LLM scoring, set `SCORE_MODE=llm` and provide a valid `OPENAI_API_KEY`.


## Job DB (JSON snapshots)
Optional on-disk snapshots for debugging and a simple "Saved" view.
- When `JOB_DB_WRITE=true`:
  - After scraping, raw jobs are written to `<JOB_DB_DIR>/raw/`.
  - After scoring, scored jobs are written to `<JOB_DB_DIR>/scored/`.
- `GET /api/db/jobs` aggregates the latest per job across base, `raw/`, and `scored/`.
- `POST /api/db/feedback` updates the latest JSON (prefer scored) with `userScore`.

Tip: If you saw folders like `t1/raw` or `t2/scored`, they came from runs/tests pointing `JOB_DB_DIR` to those locations.


### Enabling snapshots
1) In `.env` (root), set:
```
JOB_DB_WRITE=true
# optional
JOB_DB_DIR=./db
```
2) Start dev servers: `npm run dev`

3) Run a search; verify files appear under `<JOB_DB_DIR>/raw` and `<JOB_DB_DIR>/scored`.

Note: The current code gate in `apps/server/src/routes/jobs.ts` writes when the env equals `'false'` (temporary inversion used during development):

```
if ((process.env.JOB_DB_WRITE || 'false') === 'false') {
  // writes happen here
}
```

If you prefer the normal semantics (write when `JOB_DB_WRITE=true`), switch the check to `=== 'true'` in both raw and scored write blocks.


## LLM mode & logging
See DESIGN.md for LLM configuration, logging, and privacy notes.

## Developer references
- Prompt builder, Edit & Rescore UI, and detailed flows are documented in DESIGN.md.

## Testing
- Web tests:
```
npm --workspace apps/web run test
```
- Server tests:
```
npm --workspace apps/server run test
```
- Build all:
```
npm run build
```


## Troubleshooting
- No LLM logs appear:
  - Ensure `.env` has:
    - `SCORE_MODE=llm`
    - `LLM_LOG=debug`
    - `OPENAI_API_KEY=...` (no stray quotes or parentheses)
  - Fully restart the API server after changing `.env` so values are reloaded.
  - Run a search. Check the API terminal for lines starting with `[llm] score prompt` and `[llm] openai`.
  - If you recently edited server entrypoints, ensure env is loaded before routes (this repo already does that in `apps/server/src/index.ts`).
  - To preview a sample prompt without calling the LLM, run: `npm --workspace apps/server run prompt:demo`.

- Playwright asks to install browsers:
```
npx playwright install chromium
```
- Port already in use: change `PORT` in `.env` (and Vite proxy target in `apps/web/package.json` if needed).
- Empty Saved list: ensure snapshots exist and/or enable `JOB_DB_WRITE=true` and run a search to generate files.
- Large files: uploads over 5MB are rejected (see `apps/server/src/index.ts`).


## Notes
- Default scoring is random unless you enable LLM via env vars.
- This app does not store CVs in your browser. Your CV file is uploaded to the server only when you click "Find Jobs".
- This code is for educational/dev purposes. Be mindful of scraping limits and site terms.

## Render Deploy (API)
Use this when deploying `apps/server` to Render.

Required Render environment variables:
- `NODE_ENV=production`
- `CORS_ORIGIN=https://junikab.github.io`
- `SCRAPER_HEADLESS=true`
- `PLAYWRIGHT_BROWSERS_PATH=0`
- `SCORE_MODE=llm` (or `random` if you want non-LLM scoring)
- `OPENAI_API_KEY=<secret>` (required for `SCORE_MODE=llm`)

Optional Render environment variables:
- `OPENAI_MODEL=gpt-4o-mini`
- `OPENAI_BASE_URL=<provider base url>`
- `LLM_TIMEOUT_MS`, `LLM_CONCURRENCY`, `LLM_MAX_SCORE_JOBS`, `LLM_RETRIES`

Build command:
```bash
npm ci && npx playwright install chromium && npm --workspace packages/shared-types run build && npm --workspace apps/server run build
```

Start command:
```bash
npm --workspace apps/server run start
```

Frontend wiring:
- Set GitHub Actions repository variable `VITE_API_BASE_URL=https://<your-render-service>.onrender.com`
- Redeploy GitHub Pages workflow after updating the variable.
