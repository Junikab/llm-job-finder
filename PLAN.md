# Project Plan — Jora LLM Job Finder (Mock Mode)

Last updated: 2025-08-21

## 0. Objectives (Next 2–3 weeks)
- Stable, fast local dev loop with mocked analysis/scoring
- Web UI can upload a CV, set location/days, and show ranked jobs
- Use simple, non-AI starter keywords from the CV (or a small preset) and sort results with easy rules (title match, recent posts, near location, seniority fit, salary/remote).
- Basic tests and logging; minimal production readiness checklist

## 1. Milestones & Acceptance Criteria

### M1 — API Solidification (Day 1–2)
- Tasks
  - Keep @fastify/multipart with req.file() path (attachFieldsToBody disabled)
  - Support .pdf, .docx, and .txt; clear 400 for others
  - Add structured logs for uploads and query params
  - Cap pages/jobs via env vars; document in README/DESIGN
- Acceptance
  - curl upload succeeds consistently; server logs show file name, bytes, location, days
  - Error cases return clear 400 messages

### M2 — Scraper Stability & Speed (Day 2–4)
- Tasks
    - Deterministic limits: Always stop after X pages and Y jobs (from env vars MAX_PAGES, MAX_JOBS).
    - Dedupe: If the same job shows up twice, keep only one.
    - Retry once: If a page or request fails, try it one more time. If it fails again, skip it and move on.
    - Timeouts: Set a max time per page, and a max total time for the whole scraping run. If it’s too slow, abort cleanly.
- Acceptance
  - On default limits, request returns in <10s with 20–40 jobs in Sydney
  - No crashes on missing fields; logs show scraper timing

### M3 — Seed Titles/Skills Heuristic (Day 4–5)
- Tasks
    - Simple keyword extraction: From the CV text, pick obvious tech/role keywords (e.g., React, Node, “Frontend Developer”) using a small list or basic rules.
    - Fixed fallbacks: If we can’t find keywords, use a preset list for the stack (e.g., frontend: React, JavaScript, TypeScript).
    - Build the query: Combine keywords into a search like “(React Developer OR Frontend Developer)” and also apply the chosen location and days filters.
- Acceptance
  - Queries reflect at least one relevant title from CV or fallback

### M4 — Ranking Signals MVP (Day 5–7)
- Tasks
  - Add additive score: title match boost, recency boost, distance (if available), seniority match, remote flag, salary presence
  - Keep a feature flag to switch between random and heuristic scoring
  - Include reason string explaining top contributing signals
- Acceptance
  - Top 5 jobs usually contain the main keyword in title
  - Response `reason` lists the applied boosts (e.g., "title match +20, recent +10")

### M5 — Web UI Integration (Day 1–7 parallel or Week 2)
- Tasks
  - Simple Vite/React page: file input, location, days, submit
  - Display analysis snippet, query URL(s), and results table
  - Loading and error states; show reason and score columns
- Acceptance
  - E2E flow: select file → see ranked list → click opens job URL

### M6 — Testing & DX (Week 2)
- Tasks
  - Add basic API tests (supertest or light E2E via Playwright request)
  - Add mocked scraper tests (fixture HTML) for parsing correctness
  - Add sample CVs (.docx, .txt) in a fixtures/ folder
  - Add npm scripts: `test`, `lint`, `format`
- Acceptance
  - `npm test` passes locally; basic coverage for analysis, scraper, scoring

### M7 — Ops & Readiness (Week 2–3)
- Tasks
  - Health endpoint (done); add /version with git SHA (optional)
  - Document env vars; provide .env.example
  - Basic rate limit in prod profile (optional)
- Acceptance
  - README updated; DESIGN.md/PLAN.md current; .env.example present

### M8 — Lightweight Job DB (JSON snapshots)
- Tasks
  - DB-1 (done): Optional per-job JSON written right after scrape with modelScore/userScore = null; gated by JOB_DB_WRITE; written to JOB_DB_DIR/raw with stable filenames derived from normalized URL (host + pathname, no query/fragments).
  - DB-2 (done): After scoring, write per-job JSON with modelScore to JOB_DB_DIR/scored using the same stable naming; repeated runs overwrite the same job.
  - DB-3 (done): API endpoints — GET /api/db/jobs aggregates latest per job across JOB_DB_DIR, JOB_DB_DIR/raw, and JOB_DB_DIR/scored; POST /api/db/feedback updates the existing scored file (or raw as fallback) in-place with userScore and userScoredAt (no separate feedback files).
  - DB-4 (removed): Compaction to db/compiled/jobs-latest.json was dropped to keep the system simple; aggregation happens on demand.
- Acceptance
  - When enabled, JSON files are emitted under raw/ and scored/; API returns aggregated jobs with latest modelScore/userScore; UI feedback updates the same scored file and persists to disk.

## 2. Work Breakdown (Checklist)

- [ ] API: ensure req.file() + fields from data.fields fallback
- [ ] File types: .docx/.txt only; clear 400 for others
- [ ] Logging: file name, size (approx), location, days, timing
- [ ] Env: MAX_PAGES, MAX_JOBS, SCRAPER_HEADLESS documented
- [ ] Scraper: dedupe, retries, timeouts, pagination caps
- [ ] Heuristic: titles/skills extraction or fixed fallbacks
- [ ] Query builder: `(title1 OR title2)` + location, days
- [ ] Scoring flag: `SCORE_MODE=heuristic|random`
- [ ] Ranking signals: title match, recency, seniority, remote, salary
- [ ] Reason string explaining score
- [ ] Web UI: upload form + results table
- [ ] Tests: API happy-path + error-path; scraper parse fixtures
- [ ] Fixtures: sample CVs and SERP HTML
- [ ] README: quickstart; curl examples; troubleshooting
- [ ] .env.example: template for local dev

- [x] DB-1: per-job JSON snapshots after scrape (db/raw; stable filenames)
- [x] DB-2: write scored JSON after scoring (db/scored; stable filenames; overwrite)
- [x] DB-3: API list + feedback update in-place; UI displays and posts
- [ ] DB-4: compaction script to jobs-latest.json (removed)

## 3. Timeline (Suggestive)
- Week 1: M1–M4 complete (API, scraper, heuristics, ranking)
- Week 2: M5–M7 (UI, tests, docs, ops basics)

## 4. Risks & Mitigations
- Jora markup changes → Keep selectors resilient; add fixture tests
- Rate limits or anti-bot → Respect delays; allow headless true; consider caching
- Fragile parsing for .docx → Provide example CVs and robust text extraction path
- Ambiguous titles in CVs → Maintain curated fallback titles per role

## 5. Acceptance/Exit Criteria for MVP
- User can upload a .docx/.txt CV and choose location/days
- API responds <10s with at least 20 jobs (on default caps)
- Results sorted by heuristic/flag with visible reasons
- Web UI displays list and links work
- Basic tests pass; docs (README, DESIGN, PLAN) are accurate

## 6. Follow-ups (Post-MVP)
- PDF parsing is enabled; consider gating behind a feature flag if needed
- Bring back LLM analysis (OpenAI or local) with schema validation
- Better ranking using embeddings or learned weights
- Job detail enrichment (salary range parse, benefits, remote policy)
- Persist recent searches and add favorites
