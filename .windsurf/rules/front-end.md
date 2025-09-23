---
trigger: always_on
description: Use when I ask to make any front end related actions.
---

1. General Code Style
Use English for code and docs.
TypeScript only (.ts / .tsx), with strict mode.
Avoid any; if unavoidable, document with a TODO.
Prefer named exports; one React component per file.
Use JSDoc for public functions/utilities.
Keep imports ordered: std → third-party → internal.
No wildcard imports unless intended (e.g., * as Icons).

2. Naming
PascalCase: components, classes, types.
camelCase: variables, functions, props.
kebab-case: file & dir names (ButtonGroup.tsx allowed if consistent).
UPPER_SNAKE_CASE: constants, env vars.
Avoid magic numbers; define constants or enums.

3. Functions & Components
Keep functions/components small and single-purpose.
Use early returns and extract logic into hooks/utilities.
Arrow functions for inline/simple callbacks; named functions for exports.
Use default parameter values over null/undefined checks.
For multi-param utilities, use RO-RO (Receive Object, Return Object).
React specifics
Derive state, avoid duplicating props.
Use useMemo / useCallback sparingly.
Keep effects minimal with explicit deps.
Props: required first, optional with ?.
Events: onX (prop) / handleX (function).
Favor variants over boolean props (variant="primary" not isPrimary).

4. Data & Validation
Use domain types over loose primitives.
Favor immutability (readonly, as const).
Validate at boundaries (API, forms) using schema libs (e.g., zod).
Use type guards/refinements; avoid ! assertions.

5. JSX & Accessibility
Semantic HTML first; ARIA only when needed.
Inputs must have labels.
Avoid unnecessary <div> wrappers.
Ensure components are keyboard-accessible.

6. Styling
Be consistent (Tailwind, CSS Modules, etc.).
No complex inline styles; prefer classes.
Co-locate component styles.
Optimize assets; prefer SVG React components.

7. API & Networking
All calls go through /src/api.
Use fetch wrappers with:
AbortController for cancellation.
Centralized error normalization.
Never trust server data; validate & type at boundary.
Keep API types in api/types.ts (or per-endpoint).

8. Error Handling & Logging
Fail fast at boundaries; show friendly errors in UI.
No stray console.log; purposeful warn/error only.
Use type-safe error shapes.

9. Testing (Vitest + RTL + jsdom)
Tests: *.test.ts[x] next to code or in __tests__.
Test behavior, not internals.
Prefer user-event over fireEvent.
Minimal mocks; mock API at wrapper level.
Add regression tests for fixed bugs.

10. Project Structure
src/
  api/         # fetch wrappers, types
  components/  # reusable UI
  features/    # domain modules
  hooks/       # shared hooks
  lib/         # pure utils
  pages/       # route-level components
  styles/      # global styles/tokens
  test/        # test utils/mocks
Use absolute imports (@/) if configured.

11. Dependencies
Keep runtime deps minimal.
Check platform/stdlib before adding new libs.
Prefer stable libs with type support.

12. Performance
Use dynamic imports for large routes/components.
Avoid oversized deps; leverage tree-shaking.
Memoize expensive calculations.
Prevent prop churn by stabilizing references.

13. Docs & Comments
Comment only for complex logic, not obvious code.
Keep README/docs updated with behavior changes.
Prefer self-documenting names.

14. Git & Reviews
Small, focused commits with clear messages.
PRs must explain purpose; include screenshots for UI.
No TODOs without issue links.

15. Environment & Config
Env vars must be prefixed with VITE_.
Access via import.meta.env.
Never expose secrets to the client.