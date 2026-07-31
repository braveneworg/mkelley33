# src/ — Architecture & TypeScript

Deeper rules: [`src/app/AGENTS.md`](app/AGENTS.md) (UI, forms, styling),
[`src/lib/AGENTS.md`](lib/AGENTS.md) (server layer). Load
`docs/lessons/testing/` before work on test harnesses, E2E, or child
processes, and `docs/lessons/deploy/` before touching the deploy job, the
Vercel env, or the preflight — see the full table in the root `AGENTS.md`.

Everything above "Not here yet" describes the codebase as it stands and is
binding. Everything below it applies only once the thing it names exists.

## Architecture

- Server Components by default; `'use client'` only for interactive
  components. Client Components never reach Payload or `src/lib/repositories/`
  directly — Server Actions for mutations, API routes for queries.
- Mutations → Server Actions (`src/lib/actions/`). Queries → API routes
  (`src/app/api/`), REST conventions: plural nouns (`/api/posts`), correct
  verbs (GET read, POST create, PUT/PATCH update, DELETE remove).
- Validate all external input (user input, API responses, Server Action args)
  with Zod (`src/lib/validation/`) before use.
- Every API route and Server Action handles errors with `try`/`catch` and
  returns appropriate HTTP status codes.

## TypeScript

- No `any`, no non-null assertion (`!`) — define a narrower type or handle the
  null. Prefer specific types over `unknown` / `Record<string, unknown>`.
- Explicit types on function params and return values (always on exported
  components and hooks). `interface` for object shapes; discriminated unions
  for variants; `as const` over enums. Reuse existing types before adding new
  ones.
- Arrow functions over `function` (enforced by `prefer-arrow-functions`; App
  Router special files are exempted in config). Code needing `this` /
  `arguments` / `new` → use a `class` or restructure; never suppress.
- Named exports only — except App Router files that require a default export
  (`page`, `layout`, `loading`, `error`, `not-found`, `template`, `default`,
  `route`, `middleware`).
- Never suppress lint/type errors — no `eslint-disable`, no `@ts-ignore` /
  `@ts-expect-error` / `@ts-nocheck`. Fix the code, or — only when a rule is
  genuinely inapplicable — scope it in `eslint.config.mjs`.
- Security rules get no such escape. `eslint-plugin-security` runs thirteen
  rules everywhere with zero exemptions, enforced by
  `src/eslint-security.spec.ts`, which resolves the config ESLint would
  actually apply and fails if any of them is switched off for a path. A rule
  that genuinely does not fit is left out of the ruleset entirely, with the
  reason recorded in `eslint.config.mjs` — one visible decision instead of an
  override per directory. Computed member access on a record trips
  `detect-object-injection`, so reach for a `Map` (see `labelForReason` and
  `normalizeLanguage`); this applies in specs too.
- Prefer destructuring everywhere, including function parameters. Implicit
  return for single-expression bodies; no parens around single params.
- Imports use path aliases — never `../../` traversal except adjacent files.
  Two aliases carry essentially all of it: `@/*`→`src/*` and
  `@/lib/*`→`src/lib/*` (61 files), plus `@/components/*`→`src/components/*`
  (53 files) and `@payload-config`→`src/payload.config.ts`. `tsconfig.json`
  also declares `@/auth`, `@/ui/*`, `@/hooks/*`, `@/utils/*`, and
  `@/app/lib/*`; all five are unused, and the first four point at paths that
  do not exist. Do not reach for them without creating the target first.

## Unit testing (Vitest)

- Spec files `.spec.ts(x)` adjacent to source. The one exception is a
  repo-policy spec with no source module of its own
  (`src/license-header.spec.ts`); keep those at the `src/` root.
- `describe`/`it`/`expect`/`vi` are globals — never import them from
  `vitest`, enforced by `@typescript-eslint/no-restricted-imports` in the
  Vitest block of `eslint.config.mjs`. Type-only imports stay allowed: the
  globals cover values, so `import type { Mock } from 'vitest'` is still
  correct.
- Mock external deps at the service-layer boundary. Test behavior and output,
  never implementation details. One condition per test — never `expect` inside
  a conditional.
- Deterministic and independent of network, time, and ordering. Remove
  orphaned tests when code is deleted, and orphaned code when tests are
  removed.

## Naming

| Artifact         | Convention                         | Example                                   |
| ---------------- | ---------------------------------- | ----------------------------------------- |
| Component file   | kebab-case                         | `user-profile.tsx`                        |
| Component export | PascalCase arrow const             | `export const UserProfile = () => …`      |
| Page / API route | folder name                        | `/profile/page.tsx`, `/api/auth/route.ts` |
| Type / Interface | PascalCase export, kebab-case file | `types.ts` exporting `ActionResult`       |
| Hook             | `use` prefix, kebab-case file      | `use-auth.ts`                             |
| Util             | camelCase export, kebab-case file  | `format-date.ts`                          |

## Not here yet

Aspirational — the modules below do not exist, so nothing can currently
violate these rules. Follow them when introducing the thing they describe;
do not file a bug because today's code does not comply.

- **Auth and rate limiting.** `src/lib/decorators/` does not exist and no
  route or action is gated; the Payload admin handles its own auth. When
  adding protected routes: `withAuth` / `withAdmin` / `withRateLimit` in
  `src/lib/decorators/`, and gate every protected route and action through
  them.
- **`'server-only'`.** Not a dependency and no module is marked. If added,
  mark server-only modules with it and mock it in specs
  (`vi.mock('server-only', () => ({}))`).
- **Client data fetching.** `@tanstack/react-query` is installed but used in
  exactly one place — `src/components/palette/command-palette.tsx`, which
  builds its own `QueryClient` inline. `src/lib/query-keys.ts`, `src/hooks/`,
  and `@/hooks/query-options` do not exist. When client fetching outgrows
  that single call site: stable keys from `src/lib/query-keys.ts`; never call
  API routes directly from components — wrap each in a `useEntityQuery` hook
  that forwards the `AbortSignal` and documents its behavior and return
  value; give each hook a trailing, spread-last options override
  (`QueryOptionsOverride` / `InfiniteQueryOptionsOverride`) so call sites
  tune `enabled`/`staleTime` while `queryKey`/`queryFn` stay locked; and use
  `{ cache: 'no-store' }` only for never-cacheable requests.
- **Services layer.** `src/lib/services/` does not exist; business logic
  currently lives in Server Actions and repositories.
