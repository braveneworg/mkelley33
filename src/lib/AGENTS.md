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
  pattern); keep database logic out of components and routes. The older read
  paths swallow connection failures and render empty so a blip cannot take a
  page down — see `listPublishedPosts`. That is deliberate at request time
  and wrong at build time, which is why `scripts/ci-build.ts` fails the build
  if Payload never reached Mongo. The Owner-content repositories do not
  swallow anything; see the rule below.
- `validation/` — Zod schemas for all external input, one module per form.
- `harness/` — where `pnpm build:ci` and `pnpm e2e` run and how they get
  their throwaway Mongo: `run-mode.ts` decides (a container on a developer's
  machine, the runner in CI), `compose.ts` holds what `docker compose` is
  told (the commands, and the image's Node version from `mise.toml`),
  `mongo-url.ts` the connection strings, and `docker-harness.ts` runs the
  commands and always tears down. Nothing here may give a build a path to
  `.env.local` — see `docs/adr/0003-builds-and-e2e-run-in-docker.md` and
  `e2e/AGENTS.md`.
- `email/` — the mailer, split along its seam: `mailer-config.ts` resolves the
  `SMTP_*`/`EMAIL_*` environment into a typed config with no I/O, `mailer.ts`
  turns that config into a `Mailer` (the nodemailer SMTP transport, or the JSON
  fallback used when `SMTP_HOST` is unset), `transport.ts` is the `sendEmail`
  convenience over a memoized default mailer, and `templates.ts` holds the
  message bodies.
- `turnstile/` — split at the client/server seam. `site-key.ts` reads only
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and is imported by the form hook;
  `verify.ts` reads `TURNSTILE_SECRET_KEY`, is marked `server-only`, and is
  imported by `actions/run-form-submission.ts` alone. Never merge them: one
  file exporting both halves puts the secret-reading code in the client
  graph and leaves tree-shaking as the only thing removing it.
- `seed/` — the Seed, and its two directions. Reading it:
  `seed-files.ts`, `page-seed.ts` and `post-seed.ts` validate the JSON in
  the repo's `seed/` directory, built from the values in `seed-values.ts`
  and the rich-text rules in `seed-text.ts`. Filling a database from it,
  fill-only: `fill-seed.ts`, `fill-pages.ts`, `fill-posts.ts`, with
  `inspect-seed.ts` reporting what a fill would do without writing
  (`pnpm seed:check`). Capture, the other way (`pnpm capture`):
  `capture-seed.ts` reads what a database publishes, `capture-pages.ts`
  maps a stored Page back, `capture-files.ts` names the files,
  `read-upload.ts` fetches an upload's bytes, and `write-seed.ts` with
  `seed-json.ts` rewrites the directory. `in-order.ts` maps a list one item
  at a time, for both directions. `stored-fields.ts` is the one place
  that reads a stored record directly, to tell a field a record has never
  had from one the owner emptied. Read `docs/lessons/seed/` before changing
  any of them.
- `pages/` — what a Page's address is and where it leads, with no React in
  it: `page-address.ts` (the home address, the Fixed Pages, the reserved
  names, the field validator), `privacy-page.ts` (the two Blocks the privacy
  Page cannot be published without), `links.ts` (a stored link into an
  `href`, or nothing when its Page is unpublished or deleted), `load-page.ts` (the Page
  a route renders — published for a visitor, the newest draft for the
  owner's preview), `preview.ts` (whether a request is previewing, and
  which paths a preview may redirect to), and `text-words.ts` (the words of
  a rich text, which is how to ask whether one the owner emptied says
  anything).
- `media-backup/` — the files half of a Backup (`pnpm media:backup` /
  `pnpm media:restore`; the records half is `db-backup.ts`). `snapshot.ts`
  holds the pure decisions: where a snapshot goes, its name, its manifest's
  schema, and the guard that keeps a pathname inside it. `blob-store.ts` is
  the store as the two commands need it, with the one implementation that
  reaches Vercel Blob; `backup-media.ts` copies a store into a snapshot and
  `restore-media.ts` puts one back. Their specs run against real files in a
  temporary directory and `fake-blob-store.ts`, never a network.
- Loose modules for cross-cutting concerns: `site-config.ts` (what stays in
  code — the domain, the Resume's permanent address and `handle`; the
  owner's identity, links and menus are Site settings, read through `repositories/site-settings.ts`, with
  their type and the social-link list in `site-settings-content.ts`),
  `https-url.ts` (the one rule for a link the owner types),
  `json-ld.ts`, `rss.ts`, `highlight.ts`, `newsletter-tokens.ts`,
  `services-content.ts` (the `ServiceContent` type), and
  `db-backup.ts` (pure decisions for `scripts/db-backup.ts` /
  `scripts/db-restore.ts` — the wrappers keep the side effects).

## Rules

- The fill and Capture are two ends of one thing: whatever the Seed's
  schemas accept, Capture must be able to write and the fill to read. A new
  field on a Block or on Site settings goes into the schema, the fill and
  `capture-pages.ts` / `capture-seed.ts` together;
  `src/lib/seed/capture-seed.int.spec.ts` fills a database from the
  committed Seed, captures it, and fails unless every JSON file comes back
  byte for byte.
- Capture takes only what visitors are served, writes each record out field
  by field — never a stored record copied whole — and never reads Visitor
  data. The Seed is public.
- Revalidation is not the actions' job — it happens in Payload collection
  hooks (`src/collections/hooks/revalidate-post.ts`) so a CMS edit invalidates
  the same paths a form submission would.
- Owner content has one copy, the database (`docs/adr/0001`). A repository
  that reads it — `pages.ts`, `services.ts`, `site-settings.ts` — never falls back to
  source and does not catch a database failure: the error fails a build, and
  during revalidation Next keeps serving the last page it built. Do not add a
  fallback back to "harden" one.
- The repositories that predate that decision (`posts.ts`, `comments.ts`,
  `subscribers.ts`) still handle a connection failure explicitly and render
  empty. Leave them as they are until their own change.
- A draft reaches a rendered page only through `isPreviewing()` in
  `pages/preview.ts`. Draft mode is switched on in one place, the
  `/preview` route, after Payload has checked the admin's sign-in — do not
  read a draft, or call `draftMode().enable()`, anywhere else.
- Secrets come from env vars, never hardcoded, and never appear in logs or
  error messages returned to a caller.
- A missing secret fails closed in production rather than substituting a
  permissive default. `turnstile/verify.ts` is the pattern: an explicitly
  configured value is honored in every environment (the E2E harness pins
  Cloudflare's test secret into a production build), and only the implicit
  fallback is withheld once `NODE_ENV === 'production'`. One exception, keyed
  off `VERCEL_ENV === 'production'` rather than `NODE_ENV`: Cloudflare's
  published test secrets are refused there, because a test secret makes
  siteverify accept every token and the deploy preflight cannot see a
  sensitive value. Production ran on one for 38 days — see
  `docs/lessons/deploy/presence-preflight-cannot-see-a-test-secret.md`.
- Log why a verification was refused, never what was verified: Cloudflare's
  `error-codes` go to the server log; the token and the secret never do.

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
