# Jora LLM Job Finder — Design Document

Last updated: 2025-09-05

## At a glance

- Monorepo: Fastify API (TypeScript), React/Vite web, Playwright+Cheerio scraper, shared types.
- Default scoring: random (fast). Optional LLM scoring behind env flags.
- Flow: upload CV → extract text → build Jora query → scrape → pre-sort → score → return ranked jobs.
- Edit & Rescore: user edits analysis (summary/titles/skills/locationHints) and requests rescoring for current jobs.
- Run locally: `npm run dev` (API 5174, Web 5173; Vite proxies `/api/*`).

## 1. Purpose and Scope
This document describes the architecture, design decisions, data flow, and operational details of the Jora LLM Job Finder monorepo. It is written for contributors and maintainers to quickly understand how the system works, how to run it locally, and where to extend it.

Current mode: Random by default (fast local iteration). Optional LLM scoring is available via env flags.

## 2. Goals and Non-Goals
- Goals
  - Upload a CV and a search scope (location, days) via API.
  - Extract text from supported CV formats (.pdf, .docx, .txt).
  - Analyze CV to produce a minimal summary (mocked) and fallback job titles.
  - Generate Jora search URLs and scrape job listings.
  - Score jobs and return ranked results (random by default; optional LLM scoring behind flags).
  - Keep the development loop fast and simple.

- Non-Goals (for now)
  - Strict JSON schema validation of LLM responses (best-effort parsing only).
  - Advanced ranking logic and personalization.
  - Production hardening (rate limiting, full security hardening, etc.).

## 3. Repository Structure (Monorepo)
- apps/
  - server/ — Fastify API (TypeScript)
  - web/ — React/Vite web app
- packages/
  - scraper/ — Playwright + Cheerio-based Jora scraper
  - shared-types/ — Shared API types used by both server and web (CVAnalysis, JobItem, RankedJob, SavedJob)

## 4. High-Level Architecture
- Client (web or curl) uploads a CV and form fields to the server.
- Server extracts text, runs mocked analysis, builds Jora search URLs.
- Scraper fetches Jora SERP pages and job details.
- Server scores jobs randomly by default to produce results (optional LLM scoring can score per job when enabled).
- Server returns JSON to the client.
 - Web client does not persist CV files in-browser. The CV is uploaded only when the user submits the form.
- Edit & Rescore: After initial results, the user can edit the analysis (summary, titles, topSkills, locationHints) in the UI and request a rescore; the web calls a dedicated endpoint with the edited analysis and current jobs to get updated scores.

## 5. Data Flow
1) POST /api/jobs/find (multipart/form-data)
   - Fields: cv (required .pdf/.docx/.txt), location (string), days (1–60)
2) Server
   - Reads the file via Fastify multipart (req.file). Note: attachFieldsToBody is disabled to ensure reliable req.file() in dev.
   - Extracts text via pdf-parse (.pdf), Mammoth (.docx), or utf-8 (.txt).
   - analyzeCV: returns a heuristic summary and initial titles/skills.
   - Generates search URLs (rich or simple) from titles/skills and location.
   - Invokes the scraper with limits (pages/jobs) to fetch job cards.
   - scoreJob: returns a score [0..100] and short reason. Default mode "random"; when LLM is enabled, the LLM returns JSON `{score, reason}` and failures fall back to random.
   - Responds with analysis, searchUrls, total, results.
3) POST /api/jobs/rescore (JSON)
   - Body: `{ analysis: CVAnalysis, jobs: JobItem[] }`
   - Server reuses the scoring pipeline to rescore the provided jobs with the edited analysis and returns `{ total, results: RankedJob[] }`.
   - Optional request fields:
     - refreshSearch: boolean — when true, rebuild search URLs from the edited analysis (and optional `location`/`days`), re-scrape, and rescore.
     - location: string — optional override for location; defaults to the first `locationHints`.
     - days: number — optional age filter for listings.
   - Additional response fields (when available):
     - llmPromptUserPreview: string — redacted prompt header for UI preview.
     - llmPromptSystem: string — system prompt used.
     - searchUrls: string[] — present when `refreshSearch=true` triggered a rebuild.

## 6. API Design
- GET /health
  - Returns 200 OK for health checks.

- POST /api/jobs/find
  - Request (multipart):
    - cv: .pdf, .docx, or .txt
    - location: string (e.g., "Sydney NSW")
    - days: integer (1–60)
  - Response (JSON):
    - analysis: { summary: string, titles: string[], topSkills: string[], locationHints?: string[] }
    - searchUrls: string[]
    - total: number
    - results: Array<{ id, title, company, location, url, listedAgo, score, reason }>

- POST /api/jobs/rescore
  - Request (JSON):
    - analysis: CVAnalysis (edited)
    - jobs: JobItem[] (the current jobs to rescore)
  - Response (JSON):
    - total: number
    - results: RankedJob[]
  - Optional request fields:
    - refreshSearch: boolean — when true, rebuild search URLs from the edited analysis (and optional `location`/`days`), re-scrape, and rescore.
    - location: string — optional override for location; defaults to the first `locationHints`.
    - days: number — optional age filter for listings.
  - Additional response fields (when available):
    - llmPromptUserPreview: string — redacted prompt header for UI preview.
    - llmPromptSystem: string — system prompt used.
    - searchUrls: string[] — present when `refreshSearch=true` triggered a rebuild.

 - Profiles API
   - GET /api/profiles — list saved profiles. Response: `{ total, results: Profile[] }`
   - GET /api/profiles/:id — fetch a profile by id. Response: `Profile`
   - POST /api/profiles — create/update a profile. Body: `{ id?: string, label?: string, analysis: CVAnalysis }`. Response: `Profile`

## 7. Server Implementation (apps/server)
- Framework: Fastify (TypeScript)
- Plugins: @fastify/multipart, @fastify/cors, @fastify/formbody
- Multipart config: attachFieldsToBody is disabled to ensure req.file() works reliably with curl; fields are taken from data.fields (fallback to req.body).
- File limits: 5MB, max 1 file.
- File types: .pdf, .docx, .txt.
- Text extraction:
  - .pdf → pdf-parse to extract text from buffer.
  - .docx → Mammoth to extract paragraphs and join with newlines.
  - .txt → Buffer decoded as utf-8.
- Analysis (mock):
  - Returns the first ~200 characters as summary; arrays are empty.
- Scoring:
  - Random: returns a numeric score [0..100] with reason `random`.
  - LLM scoring (optional): per-job prompt to LLM; parsed numeric score [0..100]; on failure, falls back to random and annotates reason.

### Prompt Builder Utility (LLM prep)
- Location: `apps/server/src/services/prompt.ts`
- Functions:
  - `formatJobForPrompt(job)` — stable, readable block of job fields for prompts.
  - `buildJobRelevancePrompt(analysis, job)` — rubric-based instructions; includes CV summary and structured hints (titles/topSkills/locationHints) when present; response is strict JSON: `{ "score": 0..100, "reason": string }`.
  - `parseRelevanceScore(text)` — retained for legacy/simple flows; LLM mode uses strict JSON parsing with fallback to random.
- Demo: `npm --workspace apps/server run prompt:demo` prints a sample prompt and parses a mocked response.
- Tests: `apps/server/test/prompt.spec.ts` cover formatting, composition, and parsing.

## 8. Scraper (packages/scraper)
- Tools: Playwright for page navigation; Cheerio for DOM parsing.
- Inputs: search query, location, days, max pages/jobs.
- Output: normalized job objects (id/title/company/location/url/listedAgo).
- Limits: Controlled via env vars for speed.

## 9. Configuration & Environment Variables
- PORT (default 5174)
- SCRAPER_HEADLESS (default true-ish; depends on Playwright config)
- MAX_PAGES (default depends on scraper; recommend 1–2 for dev)
- MAX_JOBS (default 40)
- CORS_ORIGIN (production only; dev uses origin: true)
- SCORE_MODE: `random` | `llm` (default random)
- OPENAI_API_KEY — required when LLM is enabled

- LLM envs (when SCORE_MODE=llm):
  - LLM_CONCURRENCY: e.g., 2
  - LLM_TIMEOUT_MS: e.g., 8000
  - LLM_CACHE_TTL_MS: e.g., 900000
  - LLM_CACHE_MAX: e.g., 200
  - OPENAI_MODEL: e.g., gpt-4o-mini
  - OPENAI_BASE_URL: override API base (defaults to https://api.openai.com/v1)
  - LLM_GOOD_TRAITS / LLM_BAD_TRAITS: optional compact guidance strings in the prompt
  - LLM_LOG=debug: verbose LLM logs including constructed prompt (truncated)
  - LLM_RETRIES: capped retries with exponential backoff on 429/5xx/timeouts (default 2)
  - LLM_MAX_SCORE_JOBS: per-request cap on number of jobs scored by LLM (default 30)

## 10. Running Locally
- Start API (watch mode):
  npm --workspace server run dev

- Test health:
  curl http://localhost:5174/health

- Test job search (single line):
  curl -F "cv=@/path/to/your.cv.docx" -F "location=Sydney NSW" -F "days=7" http://localhost:5174/api/jobs/find

- Notes:
  - Ensure file exists and is .pdf, .docx, or .txt.

## 11. Observability & Error Handling
- Fastify logger enabled (info-level) with request/response logs.
- Clear 400 errors for missing file or unsupported type.
- Try/catch around route handler; non-expected errors return 500 with message.
 - When `LLM_LOG=debug` and LLM scoring is enabled, the server logs:
   - A header with job key, model, and user prompt length.
   - The first ~8000 characters of the user prompt for inspection.
   - Success/failure of OpenAI calls including latency, attempt number, and HTTP errors on retries.

## 12. Security Considerations (Dev/MVP)
- File size limited to 5MB; allowed types: .pdf/.docx/.txt.
- CORS open in dev; configure CORS_ORIGIN for production.
- No rate limiting yet (consider @fastify/rate-limit for prod).
 - No server-side persistence of CVs; processed in-memory on the server. The web client does not persist CVs locally.
 - Privacy: When LLM mode is enabled, extracted CV text and job snippets are sent to the LLM provider for scoring. Logs may include truncated portions of these prompts when `LLM_LOG=debug`.

## 13. Performance
- Concurrency limited via p-limit within scraping/scoring loops.
- MAX_PAGES / MAX_JOBS env vars allow quick dev iterations.

## 14. Key Design Decisions
- Random-by-default to remove OpenAI dependency and speed up iteration.
- PDF support enabled using pdf-parse for improved UX and parity with DOCX/TXT.
- Multipart attachFieldsToBody disabled to ensure req.file() reliability with curl; fields read from data.fields.
- Optional LLM scoring behind flags with protective measures (capped retries and per-request job cap). Falls back to random on failures.

## 15. Alternatives Considered
- Keeping attachFieldsToBody and reading file from req.body.file. Rejected for dev due to inconsistent behavior with curl; easier to rely on req.file().
- Deferring OpenAI integration entirely. Partially accepted: we run heuristic by default but provide LLM scoring behind flags for targeted debugging and evaluation.

## 16. Future Work
- Extend LLM support with rerank mode and stricter schema/response validation.
- Consider heuristic or embedding-based scoring in the future to replace random scores and provide human-readable reasons.
- Improve PDF extraction robustness (edge PDFs, encoding) and add tests/fixtures.
- Caching, deduplication, and job detail enrichment.
- Production hardening: rate limiting, auth (if needed), observability (metrics, tracing), CI/CD.

## 17. Open Questions
- If we can’t auto-read the CV, what default job titles or skills should we type into the job site to start the search?
- Besides matching keywords, what simple rules should decide which jobs appear first? For example: newer postings, closer to the chosen location, matching seniority, title contains the main term, has salary info, remote/hybrid flag, known companies.
- How many result pages or job cards should we fetch before stopping, so it stays fast but still shows enough options?

## 18. Glossary
- Mock mode: Operation mode where analysis and scoring are stubbed for speed.
- SERP: Search Engine Results Page.

---
This document should evolve alongside the codebase. Please update it when behavior or major decisions change.
