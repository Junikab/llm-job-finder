# Jora LLM Job Finder - Design Document

Last updated: 2026-04-03

## 1. Overview

This project is an npm workspace monorepo that takes a CV, builds Jora search queries, scrapes jobs, and returns ranked results.

Default behavior is optimized for local development:

- Scoring mode defaults to `random`
- Optional LLM scoring can be enabled with env flags
- Web and API run together with `npm run dev`

## 2. System Architecture

Main components:

- `apps/web` (React + Vite): upload UI, analysis editing, rescore flow, saved/profile screens
- `apps/server` (Fastify + TypeScript): CV extraction, query generation, scraping orchestration, ranking, persistence APIs
- `packages/scraper` (Playwright + Cheerio): Jora scraping package used by the API
- `packages/shared-types` (TypeScript models): shared request/response types

High-level request path:

1. Web uploads CV to API (`/api/jobs/find`)
2. API extracts CV text and builds analysis
3. API builds Jora search URLs
4. API scrapes jobs through scraper package
5. API filters, pre-sorts, scores, and returns ranked jobs

## 3. Core Flows

### 3.1 Find Jobs (`POST /api/jobs/find`)

1. Accept multipart upload (`cv`) and fields (`location`, `days`, optional `searchUrl`)
2. Validate file type: `.pdf`, `.docx`, `.txt`
3. Extract text from file buffer
4. Build heuristic CV analysis (`summary`, `titles`, `topSkills`)
5. Optionally enrich analysis with LLM (when configured)
6. Build search URLs (manual URL if provided, else generated URLs)
7. Scrape jobs
8. De-duplicate, optional recency-filter, pre-sort by keyword signals
9. Score jobs (random or LLM, depending on mode)
10. Return `{ analysis, searchUrls, total, results, llmPrompt* }`

### 3.2 Rescore (`POST /api/jobs/rescore`)

Two modes:

- Rescore existing jobs: submit edited `analysis` + `jobs`
- Refresh + rescore: set `refreshSearch=true` to rebuild URLs, re-scrape, and re-rank

Response includes updated results and prompt preview fields.

### 3.3 Saved/Applied/Feedback/Profile

- Saved jobs aggregation and updates live under `/api/db/*`
- Reusable analysis profiles live under `/api/profiles*`

## 4. API Surface

Primary routes:

- `GET /health`
- `POST /api/jobs/find`
- `POST /api/jobs/rescore`
- `GET /api/db/jobs`
- `POST /api/db/feedback`
- `POST /api/db/applied`
- `POST /api/db/saved`
- `GET /api/profiles`
- `GET /api/profiles/:id`
- `POST /api/profiles`

Shared response models are defined in `packages/shared-types/src/index.ts`.

## 5. Scoring Design

Scoring modes are controlled by `SCORE_MODE`:

- `random`:
  - score is `0..100` random
  - reason is `random`

- `llm`:
  - if `OPENAI_API_KEY` exists, API calls model and expects JSON `{ score, reason }`
  - in-memory TTL + LRU cache avoids repeated calls for identical inputs
  - if parse or request fails, fallback is random with annotated reason

Fallback reason patterns include:

- `random; llm-disabled`
- `random; llm-error: ...`

## 6. CV Analysis and Query Generation

### 6.1 Heuristic analysis (`apps/server/src/services/cv/analysis.ts`)

- Summary: first 200 chars of CV text
- Title extraction: synonym-based frequency matching
- Skill extraction: synonym-based frequency matching
- Returns `CVAnalysis` with `summary`, `titles`, `topSkills`

### 6.2 Optional LLM enrichment (`cv/enrichment.ts`)

Enrichment runs only when both conditions are satisfied:

- `OPENAI_API_KEY` is set
- (`SCORE_MODE=llm` OR `LLM_ENRICH_CV=true`)

It can update:

- `summary`
- `titles`
- `topSkills`
- `locationHints`

On failure, heuristic analysis is kept.

### 6.3 Search URL generation (`cv/search.ts`)

- Region from `JORA_REGION` (default `au`)
- Query mode:
  - `SEARCH_QUERY_MODE=rich` (default): OR title query with selected skills
  - `SEARCH_QUERY_MODE=simple`: single title query
- Location behavior:
  - explicit `location` input takes priority
  - worldwide/empty location omits `&l=` param

## 7. Ranking Pipeline Details

After scraping:

1. `dedupeJobs`: canonical URL key dedupe
2. `filterByDays`: optional listed-age filter
3. `preSortByKeywordSignals`: lightweight title/skill signal ordering
4. `scoreJobs`: concurrent scoring with `p-limit`
5. Final sort by score descending

`LLM_MAX_SCORE_JOBS` limits how many jobs are actually scored per request.

## 8. Persistence Model

JSON snapshot storage supports the Saved tab and profile workflows.

- Raw snapshots: `db/raw`
- Scored snapshots: `db/scored`
- Profiles: under db profile storage helpers

Important current behavior:

- In `jobs.ts`, writes are currently gated by:
  - `if ((process.env.JOB_DB_WRITE || 'false') === 'false')`
- This is inverted from typical semantics and is kept as-is in current code.

## 9. Configuration and Environment

Local env source of truth:

- API loads root `.env` explicitly in `apps/server/src/index.ts`
- Do not use `apps/server/.env`
- Restart API after env changes

Key env vars:

- Core: `PORT`, `CORS_ORIGIN`, `SCRAPER_HEADLESS`, `MAX_PAGES`, `MAX_JOBS`, `JORA_REGION`
- Scoring: `SCORE_MODE`, `LLM_MAX_SCORE_JOBS`
- LLM: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`, `LLM_TIMEOUT_MS`, `LLM_CONCURRENCY`, `LLM_RETRIES`, `LLM_LOG`
- Prompt guidance: `LLM_GOOD_TRAITS`, `LLM_BAD_TRAITS`
- Search tuning: `SEARCH_QUERY_MODE`
- DB: `JOB_DB_WRITE`, `JOB_DB_DIR`

## 10. Local Development

From repo root:

```bash
npm install
cp .env.example .env
npm run dev
```

Useful commands:

```bash
npm run build
npm --workspace apps/server run test
npm --workspace apps/web run test
npm --workspace apps/server run prompt:demo
```

## 11. Deployment Notes

Recommended production split:

- Web on GitHub Pages (`apps/web`)
- API on Render (`apps/server`)

Render essentials:

- set env vars in Render dashboard (not committed files)
- include `PLAYWRIGHT_BROWSERS_PATH=0`
- set `OPENAI_API_KEY` when using `SCORE_MODE=llm`

Web/API connection:

- set GitHub repository variable `VITE_API_BASE_URL` to Render API URL

## 12. Observability and Error Handling

- Fastify request logging enabled
- `400` for invalid/missing inputs
- `500` for unexpected failures in route handlers
- `LLM_LOG=debug` enables prompt/call diagnostics for LLM flows

## 13. Security and Privacy

Current protections:

- file upload size cap: 5MB
- limited allowed file extensions
- CORS configurable for production

Important privacy note:

- In LLM mode, CV-derived text and job snippets are sent to the configured model provider.

## 14. Known Limitations

- LLM response parsing is best-effort JSON parsing, not strict schema validation
- No built-in auth/rate limiting for public API use
- Scraper robustness depends on target site stability
- Snapshot write gate (`JOB_DB_WRITE`) currently uses inverted condition (see section 8)

## 15. Extension Points

Common places to extend:

- Better ranking logic: `apps/server/src/services/scoring.ts`
- Query generation strategy: `apps/server/src/services/cv/search.ts`
- CV extraction/enrichment behavior: `apps/server/src/services/cv/*`
- API payload contracts: `packages/shared-types/src/index.ts`
- UI result controls and editing UX: `apps/web/src/*`

---

Keep this document aligned with real code behavior; update it whenever API contracts or env behavior changes.
