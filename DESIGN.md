# Jora LLM Job Finder — Design Document

Last updated: 2025-08-20

## 1. Purpose and Scope
This document describes the architecture, design decisions, data flow, and operational details of the Jora LLM Job Finder monorepo. It is written for contributors and maintainers to quickly understand how the system works, how to run it locally, and where to extend it.

Current mode: Mock mode (no OpenAI calls). The system is optimized for fast iteration on scraping, API, and UI integration.

## 2. Goals and Non-Goals
- Goals
  - Upload a CV and a search scope (location, days) via API.
  - Extract text from supported CV formats (.docx, .txt; PDFs temporarily disabled).
  - Analyze CV to produce a minimal summary (mocked) and fallback job titles.
  - Generate Jora search URLs and scrape job listings.
  - Score jobs and return ranked results (scoring mocked as random).
  - Keep the development loop fast and simple.

- Non-Goals (for now)
  - Real LLM analysis and JSON validation (OpenAI disabled).
  - Advanced ranking logic and personalization.
  - PDF extraction (temporarily disabled due to import/runtime issues).
  - Production hardening (rate limiting, full security hardening, etc.).

## 3. Repository Structure (Monorepo)
- apps/
  - server/ — Fastify API (TypeScript)
  - web/ — React/Vite web app (future integration)
- packages/
  - scraper/ — Playwright + Cheerio-based Jora scraper

## 4. High-Level Architecture
- Client (web or curl) uploads a CV and form fields to the server.
- Server extracts text, runs mocked analysis, builds Jora search URLs.
- Scraper fetches Jora SERP pages and job details.
- Server applies mocked scoring to produce ranked results.
- Server returns JSON to the client.

## 5. Data Flow
1) POST /api/jobs/find (multipart/form-data)
   - Fields: file (required .docx or .txt), location (string), days (1–60)
2) Server
   - Reads the file via Fastify multipart (req.file). Note: attachFieldsToBody is disabled to ensure reliable req.file() in dev.
   - Extracts text via Mammoth (.docx) or utf-8 (.txt). PDFs rejected.
   - analyzeCV: returns a summary slice and empty arrays for titles/skills in mock mode.
   - Generates a search URL with fallback titles (e.g., "software developer OR frontend developer").
   - Invokes the scraper with limits (pages/jobs) to fetch job cards.
   - scoreJob: returns random [0..100] with reason "Mock score".
   - Responds with analysis, searchUrls, total, results.

## 6. API Design
- GET /health
  - Returns 200 OK for health checks.

- POST /api/jobs/find
  - Request (multipart):
    - file: .docx or .txt (PDFs disabled)
    - location: string (e.g., "Sydney NSW")
    - days: integer (1–60)
  - Response (JSON):
    - analysis: { summary: string, titles: string[], topSkills: string[], niceToHave: string[] }
    - searchUrls: string[]
    - total: number
    - results: Array<{ id, title, company, location, url, listedAgo, score, reason }>

## 7. Server Implementation (apps/server)
- Framework: Fastify (TypeScript)
- Plugins: @fastify/multipart, @fastify/cors, @fastify/formbody
- Multipart config: attachFieldsToBody is disabled to ensure req.file() works reliably with curl during development. Fields are taken from data.fields (fallback to req.body).
- File limits: 5MB, max 1 file.
- File types: .docx, .txt (PDF disabled; throws explicit error if uploaded).
- Text extraction:
  - .docx → Mammoth to extract paragraphs and join with newlines.
  - .txt → Buffer decoded as utf-8.
- Analysis (mock):
  - Returns the first ~200 characters as summary; arrays are empty.
- Scoring (mock):
  - Random integer [0..100]; reason "Mock score".

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
- OPENAI_API_KEY / OPENAI_MODEL — Not used in mock mode.

## 10. Running Locally
- Start API (watch mode):
  npm --workspace server run dev

- Test health:
  curl http://localhost:5174/health

- Test job search (single line):
  curl -F "file=@/path/to/your.cv.docx" -F "location=Sydney NSW" -F "days=7" http://localhost:5174/api/jobs/find

- Notes:
  - Ensure file exists and is .docx or .txt.
  - PDFs are rejected with a clear error message.

## 11. Observability & Error Handling
- Fastify logger enabled (info-level) with request/response logs.
- Clear 400 errors for missing file or unsupported type.
- Try/catch around route handler; non-expected errors return 500 with message.

## 12. Security Considerations (Dev/MVP)
- File size limited to 5MB; only .docx/.txt allowed.
- CORS open in dev; configure CORS_ORIGIN for production.
- No rate limiting yet (consider @fastify/rate-limit for prod).
- No persistent storage of CVs; processed in-memory.

## 13. Performance
- Concurrency limited via p-limit within scraping/scoring loops.
- MAX_PAGES / MAX_JOBS env vars allow quick dev iterations.

## 14. Key Design Decisions
- Mock mode to remove OpenAI dependency and speed up iteration.
- Disabled PDF support due to import/runtime issues with pdf-parse in the current environment.
- Multipart attachFieldsToBody disabled to ensure req.file() reliability with curl; fields read from data.fields.
- Random scoring to unblock UI/flow testing.

## 15. Alternatives Considered
- Keeping attachFieldsToBody and reading file from req.body.file. Rejected for dev due to inconsistent behavior with curl; easier to rely on req.file().
- Retaining OpenAI integration behind a flag. Deferred to keep surface area small and builds fast.

## 16. Future Work
- Re-enable OpenAI-based analysis and structured JSON responses.
- Heuristic or embedding-based scoring to replace random scores.
- PDF support re-introduction with a stable parser and typings.
- Frontend integration (apps/web) with file upload UI and results display.
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
