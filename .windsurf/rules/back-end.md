---
trigger: model_decision
description: Use this rule whenever generating or reviewing backend code to ensure it follows modern, efficient, secure, and maintainable best practices across architecture, APIs, security, testing, and DevOps.
---

# back-end.md — Backend Coding Rules (Windsurf/Ubuntu)

> **Goal:** Always produce modern, efficient, secure, and maintainable backend code. Default stack examples assume **TypeScript + Node.js (Fastify)** and **Playwright/Cheerio** where scraping is relevant.

## Architecture & Design
- Prefer **modular, layered design**: `routes/` (HTTP) → `services/` (business) → `adapters/` (I/O: DB, HTTP, filesystem) → `lib/` (pure utils).
- Keep **pure logic side-effect free**; isolate I/O for easier testing and concurrency control.
- Use **dependency injection** (pass interfaces/funcs) instead of global singletons.
- Favor **small, composable functions** (<50 lines) with single responsibility.
- Define **clear interfaces/types** for domain models; avoid `any`.
- Handle **fail-fast validation** at boundaries (HTTP handlers, queue consumers).

## Language & Project Setup (TypeScript/Node.js)
- Target **ES2022+**, enable `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`.
- Use **ESM** or **Type-Module** consistently; avoid mixing require/import.
- Enforce style with **Biome or ESLint + Prettier**; add `"lint"`, `"format"`, and `"typecheck"` scripts.
- Compile to **`dist/`** with source maps and **strict tsconfig** per package.
- Enable **path aliases** via `tsconfig.json` and keep imports **relative-to-root**, not deep relative chains.

## API Design (Fastify-first)
- **Explicit schemas**: Use `zod` or JSON Schema for request/response; register with Fastify for validation + type inference.
- **Versioned routes**: Prefix `/v1`, keep breaking changes behind new versions.
- **Idempotency** for POST where appropriate (e.g., uploads) with idempotency keys.
- **Pagination & limits** on list endpoints; default sane caps to prevent abuse.
- **Consistent errors**: Problem Details style `{ type, title, status, detail, instance }`; never leak stack traces.
- **CORS**: Locked-down origins in prod; in dev use `origin: true`.

## Security
- **Never trust input**: Validate all external data (HTTP, files, env, webhooks).
- **AuthN/AuthZ**: Support JWT or session tokens; check auth at the route decorator layer; use **RBAC**/scopes.
- **Secrets** only via env/secret manager; **do not log** secrets/PII; scrub logs by default.
- **Rate limit** public endpoints; backoff on external API retries.
- **Helmet-like** headers (XSS, MIME sniffing, HSTS) via Fastify plugins.
- **Output encoding**: Escape and sanitize any HTML that may be rendered/relayed.
- **File handling**: Enforce extensions/size; scan if feasible; store outside web root; use temp dirs; delete after use.
- **LLM privacy**: Redact PII from prompts when possible; document data-sharing when calling providers.
- **Dependency hygiene**: Pin versions, review advisories (`npm audit`, `pnpm audit`), avoid abandoned packages.

## Performance & Efficiency
- Use **asynchronous I/O** everywhere; avoid blocking CPU work on the event loop (offload to worker threads/queues if needed).
- Bound concurrency with **p-limit** or pools; prefer **streaming** over buffering for large payloads.
- Cache **hot results** (in-memory LRU + TTL) and/or **ETags** for GET responses.
- Prefer **batched calls** and **prepared statements** for DB operations.
- For scraping: **cap pages/jobs**, **retries with jitter**, and **short timeouts** to keep the loop snappy.

## Reliability & Resilience
- **Timeouts** on all external calls (HTTP/DB/LLM); **circuit breakers** (e.g., `opossum`) for flaky deps.
- **Retries** only on safe/transient errors with exponential backoff + jitter; **never** retry non-idempotent ops blindly.
- Implement **graceful shutdown** (SIGTERM/SIGINT): stop accepting requests, drain work, close resources.
- **Dead letter queue** or error store for failed async jobs; keep **idempotent reprocessing**.
- **Deduplicate** items by stable keys (URLs, normalized IDs) before processing/scoring.

## Observability
- **Structured logs** (JSON) with correlation/request IDs; log **context not noise**.
- Emit **metrics** (latency, RPS, error rates, cache hit rate, external call latency).
- Add **health** and **/version** (git SHA) endpoints; optional **readiness** probes.
- Centralize **error mapping**: convert internal exceptions → HTTP errors with codes and hints.

## Testing
- **Unit tests** for pure logic; **integration tests** for routes with app container.
- Use **fixtures** and **contract tests** for scrapers and external APIs; record HTML snapshots where allowed.
- **Fast paths** mocked; add **E2E smoke** in CI (server boots, health check passes).
- **100% critical-path coverage** (auth, uploads, scoring, scraping parsers).

## Code Quality & Maintainability
- Keep **cyclomatic complexity** low; extract helpers early.
- **No ad-hoc globals**; prefer explicit parameters.
- **Document tricky logic** with short comments and ADRs.
- **Meaningful names**; avoid abbreviations.
- PRs must **link to issues** and include **tests** for new behavior.

## Configuration & Secrets
- Provide `.env.example` with defaults; read env **once at boot**, validate via `zod`/`envalid`.
- **Feature flags** for risky features (e.g., LLM scoring, snapshot writing).
- Treat **timeouts, limits, and concurrency** as config knobs; choose safe defaults.

## Error Handling
- Convert **known** failure modes to typed errors (e.g., `FileTooLarge`, `UnsupportedType`, `TimeoutError`).
- **Do not catch-and-forget**: log with level + context; return actionable messages without internals.
- **Partial failures**: degrade gracefully (e.g., fall back to random scoring if LLM fails) and **annotate reasons**.

## Data & Storage
- Prefer **Append-only** event logs for audit trails; include actor and reason.
- Use **stable filenames/keys** derived from normalized identifiers (host + pathname) to avoid duplicates.
- Keep data **immutable** where possible; updates should be **idempotent** and **traceable**.

## Scraping (Playwright + Cheerio)
- Selectors should be **resilient** (data attributes > brittle CSS); back up with secondary selectors.
- **Respect robots/terms**; add polite delays when necessary.
- **Normalize and validate** parsed fields; tolerate missing data.
- **Short-circuit** on slow pages; **retry once**, then skip.
- Keep **headless** by default; provide flags to debug locally.

## LLM Integration (Optional)
- **Guardrails**: clamp timeouts, **cap concurrency**, and **cap per-request items** (e.g., score top N).
- **Deterministic prompts**: minimal, numbered instructions; require **strict JSON or single-number outputs**.
- **Parse defensively** and **fall back** on parse failures; annotate the reason for transparency.
- **Cache** recent prompts (TTL + LRU) to reduce cost/latency.
- **Redaction**: strip PII and irrelevant long text before sending to providers.

## DevOps & CI/CD
- CI runs **typecheck, lint, test, build**; fail fast on any error.
- Produce **immutable artifacts** (Docker image or tarball) with pinned Node runtime.
- **12‑factor** app: config via env; logs to stdout; stateless processes.
- Add **Snyk/Dependabot** or similar for automated dependency updates.
- **Zero-downtime deploys** with health/readiness checks; **rollbacks** ready.

## Documentation
- Keep **README** for quickstart; **DESIGN/PLAN** for decisions and roadmap.
- Auto-generate **API docs** from schemas (OpenAPI) if possible.
- Provide **cURL examples** and sample requests/responses.

## When in Doubt
- Prefer **clarity over cleverness**, **safety over speed**, and **tests over assumptions**.
- Keep changes **small and reversible**. If a choice affects users or safety, **write an ADR** and default to the safer path.