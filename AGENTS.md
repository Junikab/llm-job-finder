# Repository Guidelines

## Project Structure & Module Organization
This is an npm workspace monorepo.

- `apps/web/`: React + Vite frontend (`src/components`, `src/pages`, `src/hooks`, `src/styles`, `test`).
- `apps/server/`: Fastify API (`src/routes`, `src/services`, `src/lib`, `test`).
- `packages/scraper/`: Playwright/Cheerio scraping package used by the API.
- `packages/shared-types/`: shared TypeScript models consumed by web and server.
- Root docs: `README.md`, `DESIGN.md`, `PLAN.md`.

## Build, Test, and Development Commands
Run commands from repository root unless noted.

- `npm install`: install all workspace dependencies.
- `npm run dev`: start API and web together (API `5174`, web `5173`).
- `npm run build`: build shared packages, scraper, server, and web in order.
- `npm --workspace apps/web run test`: run web tests (Vitest + Testing Library).
- `npm --workspace apps/server run test`: run server tests (Vitest).
- `npm --workspace apps/web run lint` and `npm --workspace apps/web run format:check`: lint and formatting checks for frontend code.

## Coding Style & Naming Conventions
- Language: TypeScript across apps/packages.
- Formatting: Prettier (`apps/web`), 2-space indentation, semicolons, single quotes.
- Linting: ESLint in `apps/web/.eslintrc.cjs`; keep imports ordered (`import/order`).
- Naming: React components/pages use `PascalCase` (`LivePage.tsx`), hooks use `use*` (`usePageRouter.ts`), utilities/services use descriptive lowercase filenames (`job-db-utils.ts`, `prompt.ts`).
- Prefer page-scoped CSS class patterns like `aboutPage__*` and `saved*` to avoid style bleed.

## Testing Guidelines
- Framework: Vitest in both `apps/web` and `apps/server`.
- Location: tests live under each app’s `test/` directory.
- Naming: `*.spec.ts` / `*.spec.tsx` (for example `Routing.spec.tsx`).
- Before opening a PR, run:
  - `npm run build`
  - `npm --workspace apps/server run test`
  - `npm --workspace apps/web run test`

## Commit & Pull Request Guidelines
- Follow Conventional Commit style seen in history (`feat:`, `fix:`, `refactor:`, `docs:`, `style:`).
- Keep commits focused by scope (web/server/scraper/shared-types).
- PRs should include:
  - short problem/solution summary,
  - linked issue/task (if any),
  - test/build evidence (commands + results),
  - UI screenshots for frontend-visible changes.
