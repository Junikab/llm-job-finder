# Jora LLM Job Finder

A monorepo app that uploads a CV, scrapes Jora jobs, and ranks the results.

- Web: React + Vite (`apps/web`)
- API: Fastify + TypeScript (`apps/server`)
- Scraper: Playwright + Cheerio (`packages/scraper`)

Default scoring is `random` for fast local development. Optional LLM scoring is available with `SCORE_MODE=llm`.

## What It Does

1. Upload CV (`.pdf`, `.docx`, or `.txt`)
2. Extract CV text and profile hints
3. Build Jora search URLs
4. Scrape job ads
5. Rank and return jobs

## Project Structure

- `apps/web` - frontend UI
- `apps/server` - API and scoring
- `packages/scraper` - Jora scraper
- `packages/shared-types` - shared TypeScript models
- `DESIGN.md` - architecture and deeper details

## Quick Start (Local)

```bash
npm install
cp .env.example .env
npm run dev
```

Open:

- Web: `http://localhost:5173`
- API health: `http://localhost:5174/health`

Important:

- Local env source of truth is root `.env`.
- Do not create `apps/server/.env`.
- Restart API after `.env` changes.

## Common Commands

```bash
# run web + api in dev
npm run dev

# build all workspaces
npm run build

# tests
npm --workspace apps/server run test
npm --workspace apps/web run test

# run one app only
npm --workspace apps/server run dev
npm --workspace apps/web run dev
```

## Scoring Modes

Set in root `.env`:

- `SCORE_MODE=random` (default)
- `SCORE_MODE=llm` (requires `OPENAI_API_KEY`)

If LLM mode fails (timeout/provider error), API falls back to random scoring.

## Key Environment Variables

In root `.env`:

- `PORT` (default `5174`)
- `SCORE_MODE` (`random` or `llm`)
- `OPENAI_API_KEY` (required for `llm` mode)
- `OPENAI_MODEL` (default `gpt-4o-mini`)
- `LLM_TIMEOUT_MS`, `LLM_CONCURRENCY`, `LLM_RETRIES`
- `LLM_MAX_SCORE_JOBS`
- `SCRAPER_HEADLESS`, `MAX_JOBS`, `MAX_PAGES`

For deployed frontend (GitHub Pages), set repository variable:

- `VITE_API_BASE_URL=https://<your-render-service>.onrender.com`

## API Endpoints (Quick)

- `GET /health`
- `POST /api/jobs/find`
- `POST /api/jobs/rescore`
- `GET /api/db/jobs`
- `POST /api/db/feedback`
- `GET /api/profiles`

## Deploy (Simple)

Recommended:

- GitHub Pages for `apps/web`
- Render for `apps/server`

### Render API Setup

Required env vars:

- `NODE_ENV=production`
- `CORS_ORIGIN=https://junikab.github.io`
- `SCRAPER_HEADLESS=true`
- `PLAYWRIGHT_BROWSERS_PATH=0`
- `SCORE_MODE=llm` (or `random`)
- `OPENAI_API_KEY=<secret>` (for `llm` mode)

Build command:

```bash
npm ci && npx playwright install chromium && npm --workspace packages/shared-types run build && npm --workspace apps/server run build
```

Start command:

```bash
npm --workspace apps/server run start
```

## Troubleshooting

- No LLM behavior:
  - Check `SCORE_MODE=llm`
  - Check `OPENAI_API_KEY`
  - Restart API after env updates
- Playwright errors:
  - `npx playwright install chromium`
- Frontend cannot reach API:
  - Verify `VITE_API_BASE_URL`
  - Verify Render `CORS_ORIGIN`

## Notes

- Do not commit `.env`.
- This is a dev/portfolio project; use responsibly with scraping limits.
