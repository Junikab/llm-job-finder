# Ideas to implement later

## LLM Top-N Rerank (deferred)

- __Concept__: After initial scoring (random or LLM), ask the LLM to look at only the top N jobs and optionally reshuffle them to produce a better final order.
- __Why__: Cheaper and faster than scoring every job via LLM; provides a quality nudge at low cost.
- __How__:
  - Build a compact JSON prompt with the candidate profile (titles, topSkills, summary) and a small array of the top-N jobs (id/title/location/listedAgo/short description).
  - Ask the LLM to return strictly valid JSON: `{ "order": [jobId...], "reasons": { jobId: "short reason" } }`.
  - Reorder the top-N slice accordingly. Annotate reasons on the reordered items (e.g., `llm-rerank pos 1; llm: better match`).
- __Env knobs__ (when re-enabled):
  - `RERANK_TOP_N` (0=off) — replaces previous `LLM_TOP_N` and removes need for `LLM_MODE=rerank`.
  - Reuse existing `OPENAI_MODEL`, `OPENAI_BASE_URL`, `LLM_CONCURRENCY`, `LLM_TIMEOUT_MS`, `LLM_RETRIES`.
- __Notes__:
  - Keep strict JSON response format; handle errors gracefully (no-op with annotations in debug).
  - Start with N=10 by default; cap to a safe upper bound (e.g., 50).
  - This is a nice-to-have; current system works with random or LLM scoring alone.

## User-editable CV Summary (deferred)

- __Concept__: After the initial LLM CV summarization step, let the user preview and optionally edit the generated summary before proceeding to build search URLs and score jobs. Default is to use the LLM summary as-is; editing is opt-in.
- __Why__: Gives candidates control to correct mistakes, add nuance, and ensure the profile reflects their background (works for any profession, not tied to a specific role).
- __How__:
  - Backend: keep current single-step flow, but consider exposing a lightweight `POST /api/cv/summary` endpoint that accepts a CV file and returns `{ summary, source: 'llm'|'heuristic' }` for a two-step UI. Alternatively, support a `summaryOnly=true` flag on `/api/jobs/find`.
  - Frontend: show a summary textarea with character count; buttons: "Use summary" to proceed, optional "Regenerate" (re-run summarize) when LLM is enabled. Persist last-used summary locally per recent CV.
  - State/telemetry: include `analysis.summarySource` (`llm` vs `heuristic`) in responses to inform the UI; log redact-safe summary length for observability.
  - Validation: enforce max length (e.g., 1200 chars) before proceeding to scoring.
  - Privacy: redact PII in the displayed summary where feasible; avoid storing raw CV long-term.
  - Tests: add route unit tests for summarize-only; UI tests for edit/submit flow and validation.
