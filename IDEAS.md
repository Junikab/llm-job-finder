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

## Edit & Rescore — Improvements

- __Current__: The web UI now supports editing `summary`, `titles`, `topSkills`, and `locationHints` in `AnalysisHeader`, then rescoring via `POST /api/jobs/rescore`. The prompt builder includes these hints to influence scores.

- __Next ideas__:
  - Persist edits per CV locally (localStorage/indexedDB) with a stable key (e.g., hash of CV bytes or recent item id) so reopening the app restores your last draft.
  - Validation UX: deduplicate comma lists; cap `titles` (≤3), `topSkills` (≤8), `locationHints` (≤3); trim and normalize casing; surface quick warnings inline.
  - Undo/reset: add "Reset edits" to revert to server-provided analysis without leaving edit mode.
  - Regenerate (LLM mode): button to re-run CV summarization when LLM is enabled, then let user tweak and rescore.
  - Dirty state indicator: warn before navigating away with unsaved edits.
  - Tests: unit tests for `useAnalysisEditor` hook and `mapRankedToJobItem` util; integration test to verify that editing specific skills increases relevant job scores.
  - Accessibility: label inputs properly, ensure buttons and textareas are keyboard-accessible; announce rescoring status via ARIA-live.
  - Telemetry (dev): count how often users rescore and which fields change (redact-safe, no PII).

## Summary-only Step (optional)

- __Concept__: Provide a `summaryOnly=true` flow or a dedicated `POST /api/cv/summary` endpoint to split the process into (1) summarize, (2) review/edit, (3) search + score. This is optional because we already support editing-and-rescoring after the initial run.
- __Why__: Useful when users want to polish the profile before any scraping/scoring.
- __How__:
  - Backend: a lightweight route returning `{ summary, titles, topSkills, locationHints }` from the CV.
  - Frontend: wizard-like UX; Analysis review screen with character counter and quality hints.
