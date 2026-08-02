# src/lib/ — Server layer

Read with [`src/AGENTS.md`](../AGENTS.md).

Everything above "Not here yet" describes the codebase as it stands and is
binding. Everything below it applies only once the thing it names exists.

## What is here

- `actions/` — Server Actions, `'use server'` at the top of the file
  (`contact.ts`, `newsletter.ts`). Every action validates its args with a Zod
  schema from `validation/`, wraps work in `try`/`catch`, and returns the
  shared result shape from `actions/types.ts` rather than throwing at the
  caller.
- `repositories/` — ALL Payload/MongoDB access lives here (repository
  pattern); keep database logic out of components and routes. Read paths
  swallow connection failures and render empty so a blip cannot take a page
  down — see `listPublishedPosts`. That is deliberate at request time and
  wrong at build time, which is why `scripts/ci-build.mjs` fails the build if
  Payload never reached mongod.
- `validation/` — Zod schemas for all external input, one module per form.
- `email/` — `transport.ts` (nodemailer; falls back to the JSON transport when
  `SMTP_HOST` is unset) and `templates.ts`.
- `turnstile/` — split at the client/server seam. `site-key.ts` reads only
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and is imported by the form hook;
  `verify.ts` reads `TURNSTILE_SECRET_KEY`, is marked `server-only`, and is
  imported by `actions/run-form-submission.ts` alone. Never merge them: one
  file exporting both halves puts the secret-reading code in the client
  graph and leaves tree-shaking as the only thing removing it.
- Loose modules for cross-cutting concerns: `site-config.ts`, `json-ld.ts`,
  `rss.ts`, `highlight.ts`, `newsletter-tokens.ts`, `cv-content.ts`,
  `services-content.ts`, `services-seed.ts`, and `db-backup.ts` (pure
  decisions for `scripts/db-backup.ts` / `scripts/db-restore.ts` — the
  wrappers keep the side effects).

## Rules

- Revalidation is not the actions' job — it happens in Payload collection
  hooks (`src/collections/hooks/revalidate-post.ts`) so a CMS edit invalidates
  the same paths a form submission would.
- Handle connection failures explicitly; never let a repository throw into a
  Server Component render.
- Secrets come from env vars, never hardcoded, and never appear in logs or
  error messages returned to a caller.

## Not here yet

Aspirational — these directories do not exist, so nothing can currently
violate the rules attached to them.

- **`services/`** — business logic currently lives in Server Actions and
  repositories. Add this layer only when an action grows logic worth testing
  independently of its transport.
- **`decorators/`** — `withAuth`, `withAdmin`, `withRateLimit`. Nothing is
  gated today; the Payload admin handles its own auth. Introduce these with
  the first protected route or action, and gate every one through them.
- **`docs/lessons/prisma-mongo/`** — cited by an earlier draft of this file,
  but there is no Prisma here: the data layer is Payload CMS 3 over MongoDB.
  Database lessons that do exist live in `docs/lessons/testing/`; load those
  before touching the memory-server harnesses.
