# e2e/ — Harness Invariants

The suite runs ONLY via `pnpm e2e` (`scripts/e2e.ts`, under tsx). That script
is the enforcement point for every invariant below — keep the two in sync. Its
pure decisions (the pinned env, the port, the probe token) live in
`src/lib/e2e/harness-config.ts`, and `harness-config.spec.ts` turns the
invariants below into assertions, so weakening one also fails the unit suite.

## Hermetic env — no `.env*` input, ever

`makeEnv()` pins every env-sensitive key: throwaway in-memory Mongo URI,
always-pass Turnstile test keys, `SMTP_HOST=''` (forces the JSON email
transport — nothing can leave the suite), `BLOB_READ_WRITE_TOKEN=''`.
Seeding runs via `pnpm exec tsx` so `.env.local` is never loaded;
`next build`/`next start` do load it, but explicit process env always wins.
Never weaken a pinned key or read `.env*` to "fix" a failure.

## Dedicated port + pre-spawn guard

The server runs on port 4310 (`E2E_PORT`), never Next's default 3000 where a
developer's `pnpm dev` (against a real DB) could listen. `assertPortFree()`
aborts if ANYTHING answers on the port — checked before setup and again
right before spawning, so probes can never pass against a foreign server.

## Seed BEFORE build (ISR)

Every page uses ISR (`revalidate = 300`); building against an empty database
would bake empty services into the prerendered HTML and serve that stale
markup to the specs' first visit. The harness seeds first — keep it so.

## EMAIL_LOG_UNSENT log-scrape protocol

`EMAIL_LOG_UNSENT='true'` makes the JSON transport log message content; the
newsletter spec scrapes `/newsletter/confirm?token=([0-9a-f]{64})` from
`e2e-server.log` to complete the opt-in round trip. The harness's DB
readiness probe deliberately uses a NON-hex token so it can never match that
regex if the probe URL is ever logged.

## Async spawn only — never `spawnSync`

The harness owns a `MongoMemoryServer` whose piped output OUR event loop
must drain; any blocking call (e.g. `spawnSync`) wedges mongod on a full
pipe buffer. Children also spawn `detached` so kill paths signal the whole
process group. Every child goes through `src/lib/proc/run-child.ts`, which
owns both of those and is specced; do not hand-roll another `spawn` here.
See `docs/lessons/testing/spawnsync-starves-owned-child-pipes.md`.

## Never run the suite against a server you didn't spawn

No pointing `E2E_BASE_URL` (or `pnpm exec playwright test`) at a dev server,
a deployed site, or anything else already running: the specs WRITE (contact
messages, newsletter subscribers). Only the harness-spawned server is safe.
