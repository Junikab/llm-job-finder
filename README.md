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
5) Jobs are scored based on SCORE_MODE and returned to the web app. Heuristic mode adds reason strings. When SCORE_MODE=llm and LLM_MODE=replace with a valid OPENAI_API_KEY, the server calls OpenAI per job using a detailed prompt, with concurrency and timeouts; failures gracefully fall back to heuristic.
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
- `SCORE_MODE=random` — scoring mode: `random` | `heuristic` | `llm`
- `OPENAI_API_KEY=` — required when LLM is enabled (replace or rerank)

Additional (supported by server code):
- `SCRAPE_TOTAL_TIMEOUT_MS` — max total scrape time (optional)
- `JOB_DB_WRITE=false|true` — controls JSON snapshot writes; note: current code writes when the value is `'false'` (temporary dev inversion)
- `JOB_DB_DIR` — base directory to write/read job JSON (default: `<cwd>/db`)

## Scoring modes
- **random** (default): returns a random 0–100 score with reason `random`.
- **heuristic**: additive signals with reasons:
  - title keyword match (up to +30, based on CV titles/skills)
  - recency based on `listedAgo` (0–25)
  - remote/hybrid indicator (+5)
  - salary presence (+5)
  Reason string lists components, e.g., `title +20, recency +15, remote +5, salary +5`.
- **llm**: enable LLM features controlled by `LLM_MODE`:
  - `replace`: per-job LLM scoring replaces heuristic. Concurrency is limited by `LLM_CONCURRENCY`; each call times out per `LLM_TIMEOUT_MS`. On error or parse failure, the server falls back to heuristic and annotates the reason (e.g., `llm-replace-error: timeout`).
  - `rerank`: top-N rerank scaffold (keeps original scores, may append short LLM reason notes; currently a stub).
  Requires `OPENAI_API_KEY` (and `OPENAI_MODEL`, defaults to `gpt-4o-mini`).


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
LLM replace-mode is wired. When enabled, per-job prompts are sent to OpenAI and a single numeric score (0–100) is parsed. Rerank mode is scaffolded.

- Relevant envs:
  - `LLM_MODE`: `off` | `rerank` (top N) | `replace` (LLM per job)
  - `LLM_TOP_N`: e.g. `10`
  - `LLM_CONCURRENCY`: e.g. `2` (max parallel LLM calls)
  - `LLM_TIMEOUT_MS`: e.g. `8000` (per-call timeout in ms)
  - `OPENAI_API_KEY`: required when LLM is enabled
  - `OPENAI_MODEL`: e.g. `gpt-4o-mini`
  - `LLM_GOOD_TRAITS` / `LLM_BAD_TRAITS`: optional compact guidance strings injected into the prompt
  - `LLM_LOG=debug`: optional verbose logging of LLM requests/results

Privacy note: When LLM mode is enabled, extracted CV text and job snippets are sent to the provider for scoring.

### Compact prompt customization
To guide the model without pasting long examples, set concise traits in `.env`:

```
LLM_GOOD_TRAITS=junior, React/TypeScript, mentorship, remote, Sydney/NSW
LLM_BAD_TRAITS=senior-only, backend-only Java, no UI, on-site far away
```

These appear in the prompt after the CV summary and before the rubric, keeping token usage low.


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
- Playwright asks to install browsers:
```
npx playwright install chromium
```
- Port already in use: change `PORT` in `.env` (and Vite proxy target in `apps/web/package.json` if needed).
- Empty Saved list: ensure snapshots exist and/or enable `JOB_DB_WRITE=true` and run a search to generate files.
- Large files: uploads over 5MB are rejected (see `apps/server/src/index.ts`).


## Notes
- Default scoring is heuristic unless you enable LLM via env vars.
- Recent CVs are stored locally in your browser (IndexedDB) to let you re-use or remove them.
- This code is for educational/dev purposes. Be mindful of scraping limits and site terms.
