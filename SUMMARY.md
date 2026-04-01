# Publish Handoff Notes

## Goal
Publish the project so it works from any machine, and showcase FE + AI capability.

## Env Policy (Local vs Render)
- Local development uses a single env source: root `.env`.
- `apps/server/.env` should not exist.
- Render should use service environment variables in the dashboard (no local `.env` file deployment).

## What Was Confirmed
- Backend on Render was deployed at:
  - `https://llm-job-finder.onrender.com`
- `GET /` returning `404 Route GET:/ not found` is expected for this API.
- Health endpoint is correct and working:
  - `GET /health` -> `{"ok":true}`
- Frontend API base should be configured in **GitHub repo variables** (not Render):
  - `VITE_API_BASE_URL=https://llm-job-finder.onrender.com`
- GitHub Pages workflow can be run manually from:
  - `Actions -> Deploy Web To GitHub Pages -> Run workflow (main)`

## Deployment Issues Encountered (and outcomes)
- Playwright/scraper errors during Render deploy:
  - `npx playwright install --with-deps chromium` failed in Render build environment.
  - Working direction was to use `npx playwright install chromium` in build command.
- CORS was checked and backend returned expected CORS headers for:
  - `Origin: https://junikab.github.io`
- Frontend "Failed to fetch" debugging showed:
  - Need to use correct GitHub Pages path casing:
    - `https://junikab.github.io/llm-job-finder/` (lowercase)

## Product Decision
You decided to proceed with **Option 2**:
- **Server-side LLM key + free-tier LLM**
- Reason: best user experience (no user-provided key), stronger AI showcase.

## Option 2 Tradeoffs (agreed)
- Pros:
  - Real AI outputs.
  - Better demo quality for portfolio.
  - No user friction from BYOK.
- Cons:
  - Free-tier quota can run out.
  - Demo availability can degrade unexpectedly.
  - May become paid if usage grows.
- Risks/Vulnerabilities:
  - Public endpoint abuse can burn quota/cost.
  - Prompt/content abuse can increase token usage.

## Recommended Render Environment (for Option 2)
- Required:
  - `NODE_ENV=production`
  - `CORS_ORIGIN=https://junikab.github.io`
  - `SCRAPER_HEADLESS=true`
  - `PLAYWRIGHT_BROWSERS_PATH=0`
  - `SCORE_MODE=llm`
  - `OPENAI_API_KEY=<secret>`
- Optional:
  - `OPENAI_MODEL=gpt-4o-mini` (or another chosen model)
  - `OPENAI_BASE_URL` (if using a non-default provider URL)
  - `LLM_TIMEOUT_MS`, `LLM_CONCURRENCY`, `LLM_MAX_SCORE_JOBS`, `LLM_RETRIES`

## Recommended Render Build/Start Commands
- Build:
```bash
npm ci && npx playwright install chromium && npm --workspace packages/shared-types run build && npm --workspace apps/server run build
```
- Start:
```bash
npm --workspace apps/server run start
```

## GitHub Pages Side
- Repo Variable (Actions -> Variables):
  - `VITE_API_BASE_URL=https://llm-job-finder.onrender.com`
- Trigger web deploy after variable changes.

## Pre-Deploy Checklist
1. Confirm local API behavior with root `.env` only.
2. Confirm `OPENAI_API_KEY` is not committed (`git ls-files .env` returns nothing).
3. Ensure Render env vars are set (especially `OPENAI_API_KEY` when `SCORE_MODE=llm`).
4. Deploy Render API, then verify `GET /health`.
5. Redeploy GitHub Pages after setting `VITE_API_BASE_URL`.

## Suggested Next Thread Focus
1. Harden Option 2 for public use (rate limiting, abuse controls, cost caps).
2. Improve error handling so frontend shows real backend error context.
3. Add clear portfolio messaging for "LLM mode active" and fallback behavior.
4. Final publish checklist and smoke tests for both Render + GitHub Pages.
