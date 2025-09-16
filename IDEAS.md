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
