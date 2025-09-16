# Jora LLM Job Finder (Mock Mode)

A small monorepo that uploads a CV, builds Jora search queries, scrapes job ads, and returns a ranked list. LLM scoring is mocked for fast local dev.

- Server: Fastify (TypeScript)
- Web: React + Vite
- Scraper: Playwright + Cheerio (in `packages/scraper`)


## Repository layout
- `apps/server/` — Fastify API
- `apps/web/` — React web app
- `packages/scraper/` — Jora scraper used by the API
- `PLAN.md` / `DESIGN.md` — project docs


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
1) Web uploads your CV to `POST /api/jobs/find` (multipart) — see `apps/server/src/routes/jobs.ts`.
2) Server extracts text (`pdf-parse` for PDF, `mammoth` for DOCX, plain for TXT) and picks simple titles/skills.
3) It builds Jora URLs (e.g., `https://au.jora.com/j?...`).
4) Scraper visits those pages and collects jobs (bounded by env limits).
5) Jobs are scored based on SCORE_MODE and returned to the web app. Default is random (reason: `random`). When SCORE_MODE=llm and LLM_MODE=replace with a valid OPENAI_API_KEY, the server calls OpenAI per job using a detailed prompt; on failures it gracefully falls back to random and annotates the reason.
6) Optional: server can save JSON snapshots of raw and scored jobs to disk (see Job DB below).


## API (dev)
- `POST /api/jobs/find` — form-data fields
  - `cv` (file, required): .pdf/.docx/.txt, ≤ 5MB
  - `location` (string, optional)
  - `days` (number, optional)
  - Response: `{ analysis, searchUrls, total, results: RankedJob[] }`

- `GET /api/db/jobs` — list merged jobs from on-disk JSON snapshots
  - Response: `{ total, results: SavedJob[] }`

- `POST /api/db/feedback` — update `userScore` for a job (in-place in the JSON file)
  - JSON body: `{ jobId: string, userScore: number }`
  - Response: `{ ok: true }`

See code: `apps/server/src/routes/jobs.ts`, `apps/server/src/routes/db.ts`, `apps/server/src/services/job-db.ts`.


## cURL examples

- Healthcheck:
```bash
curl -sf http://localhost:5174/health | jq
# remove '| jq' if you don't have jq installed
```

- Find jobs (PDF/DOCX/TXT upload):
```bash
curl -X POST http://localhost:5174/api/jobs/find \
  -F "cv=@/absolute/path/to/your-cv.pdf" \
  -F "location=Sydney NSW" \
  -F "days=7" | jq '.total, .searchUrls, .results[0]'
```

- List saved/merged jobs from Job DB snapshots:
```bash
curl -s http://localhost:5174/api/db/jobs | jq '.total, .results[0]'
```

- Submit feedback (rate a job):
```bash
curl -X POST http://localhost:5174/api/db/feedback \
  -H 'Content-Type: application/json' \
  -d '{"jobId":"<copy-from-results-id>","userScore":5}' | jq
```


## Environment variables
From `.env.example` (root):
- `PORT=5174` — API port
- `SCRAPER_HEADLESS=true` — run Playwright headless
- `MAX_JOBS=40` — cap total jobs
- `MAX_PAGES=3` — cap pages per search URL
- `JORA_REGION=au` — Jora region prefix (domain)
- `SCORE_MODE=random` — scoring mode: `random` | `llm`
- `SEARCH_QUERY_MODE=rich|simple` — query builder mode; `rich` uses quoted titles + top skills; `simple` uses only the top detected title (no quotes/skills)
- `OPENAI_API_KEY=` — required when LLM is enabled (replace or rerank)

- `OPENAI_MODEL=gpt-4o-mini` — model used for LLM calls (default shown)
- `OPENAI_BASE_URL=` — optional API base override (e.g., Azure/OpenRouter/proxy). Defaults to `https://api.openai.com/v1`.
- `LLM_LOG=debug` — enable verbose LLM logs (prints constructed prompt and a truncated body for review)
- `LLM_RETRIES=2` — retry attempts for OpenAI calls (applies to 429, 5xx, and timeouts). Reasonable range: 1–5.
- `LLM_MAX_SCORE_JOBS=30` — per-request cap on how many jobs are scored by the LLM (limits cost).

Additional (supported by server code):
- `SCRAPE_TOTAL_TIMEOUT_MS` — max total scrape time (optional)
- `JOB_DB_WRITE=false|true` — controls JSON snapshot writes; note: current code writes when the value is `'false'` (temporary dev inversion)
- `JOB_DB_DIR` — base directory to write/read job JSON (default: `<cwd>/db`)

## Scoring modes
Default: random (see `.env.example`).

- **random**: returns a random 0–100 score with reason `random`.
- **llm**: enable LLM per-job scoring via `LLM_MODE=replace`. Concurrency is limited by `LLM_CONCURRENCY`; each call times out per `LLM_TIMEOUT_MS`. On error or parse failure, the server falls back to random and annotates the reason (e.g., `random; llm-replace-error: timeout`). Requires `OPENAI_API_KEY` (and `OPENAI_MODEL`, defaults to `gpt-4o-mini`).

Note: The server uses a lightweight pre-sort (`preSortByKeywordSignals`) based on simple title/skill keyword matches before scoring. This pre-sort is not a scoring mode; it only helps choose which jobs to score first.

Note on interplay between `SCORE_MODE` and `LLM_MODE`:
- To use LLM scoring, set `SCORE_MODE=llm` AND `LLM_MODE=replace` (plus a valid `OPENAI_API_KEY`).


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


## LLM mode
LLM replace-mode is wired. When enabled, per-job prompts are sent to OpenAI and a single numeric score (0–100) is parsed. If an LLM call fails or is disabled, the server falls back to random and annotates the reason.

- Relevant envs:
  - `LLM_MODE`: `off` | `replace` (LLM per job)
  - `LLM_CONCURRENCY`: e.g. `2` (max parallel LLM calls)
  - `LLM_TIMEOUT_MS`: e.g. `8000` (per-call timeout in ms)
  - `LLM_CACHE_TTL_MS`: e.g. `900000` (TTL for in-memory replace-mode score cache)
  - `LLM_CACHE_MAX`: e.g. `200` (max entries in the in-memory cache; LRU eviction)
  - `OPENAI_API_KEY`: required when LLM is enabled
  - `OPENAI_MODEL`: e.g. `gpt-4o-mini`
  - `OPENAI_BASE_URL`: override API base (defaults to `https://api.openai.com/v1`)
  - `LLM_GOOD_TRAITS` / `LLM_BAD_TRAITS`: optional compact guidance strings injected into the prompt
  - `LLM_LOG=debug`: optional verbose logging of LLM requests/results (includes constructed prompt and truncated body for inspection)
  - `LLM_RETRIES`: retry attempts for OpenAI calls (applies to 429, 5xx, and timeouts; default 2)
  - `LLM_MAX_SCORE_JOBS`: per-request cap on how many jobs are scored by the LLM (default 30)

Privacy note: When LLM mode is enabled, extracted CV text and job snippets are sent to the provider for scoring.

### Compact prompt customization
To guide the model without pasting long examples, set concise traits in `.env`:

```
LLM_GOOD_TRAITS=junior, React/TypeScript, mentorship, remote, Sydney/NSW
LLM_BAD_TRAITS=senior-only, backend-only Java, no UI, on-site far away
```

These appear in the prompt after the CV summary and before the rubric, keeping token usage low.


## LLM logging & debugging

Follow these steps to see the actual prompts and responses used by the LLM in replace mode:

1) Enable LLM replace scoring in `.env` (root):
```
SCORE_MODE=llm
LLM_MODE=replace
LLM_LOG=debug
OPENAI_API_KEY=sk-...   # ensure this has no stray quotes or parentheses
```

Optional controls:
- `LLM_RETRIES=2` — capped retries with exponential backoff for 429/5xx/timeouts
- `LLM_MAX_SCORE_JOBS=30` — limits how many jobs are scored per request

2) Fully restart the API server after changing `.env` so variables are reloaded.

3) Run a job search (via the web app or cURL). In the API terminal you should see log entries like:
```
[llm] replace prompt { jobKey: '...', model: 'gpt-4o-mini', userLen: 12345 }
[llm] replace prompt user <first 8000 characters of the user prompt>
[llm] openai ok { ms: 1234, contentLen: 42, attempt: 1 }
```
If a call fails, logs include detailed HTTP errors and retry attempts.

Privacy reminder: Prompt logs include slices of CV text and job snippets; use them only for local debugging.

## Prompt builder (dev utility)
- Code: `apps/server/src/services/prompt.ts`
  - `formatJobForPrompt(job)`
  - `buildJobRelevancePrompt(analysis, job)`
  - `parseRelevanceScore(text)`
- Demo:
  ```bash
  npm --workspace apps/server run prompt:demo
  ```
  Prints a sample prompt and demonstrates score parsing.
- Tests: `apps/server/test/prompt.spec.ts`


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
    - `LLM_MODE=replace`
    - `LLM_LOG=debug`
    - `OPENAI_API_KEY=...` (no stray quotes or parentheses)
  - Fully restart the API server after changing `.env` so values are reloaded.
  - Run a search. Check the API terminal for lines starting with `[llm] replace prompt` and `[llm] openai`.
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
- Recent CVs are stored locally in your browser (IndexedDB). Up to 5 items are kept and older ones are pruned. If IndexedDB is unavailable (e.g., private mode), a sessionStorage fallback stores a base64 Data URL.
- On load, the web app best-effort requests persistent storage via `navigator.storage.persist()` so browsers are less likely to evict local data.
- This code is for educational/dev purposes. Be mindful of scraping limits and site terms.
