# e2e/ — Harness Invariants

The suite runs ONLY via `pnpm e2e` (`scripts/e2e.ts`, under tsx). That script
is the enforcement point for every invariant below — keep the two in sync. Its
pure decisions live in two places, each with a spec that turns the prose here
into assertions, so weakening an invariant also fails the unit suite:

- `src/lib/e2e/harness-config.ts` — the pinned env, the port, the probe token;
- `src/lib/harness/` — where the run happens and which `docker compose`
  commands it issues. `src/docker-policy.spec.ts` pins the Docker files
  themselves.

`pnpm build:ci` (`scripts/ci-build.ts`) goes through the same
`src/lib/harness/` launcher. The next section applies to it in full, and so
does the container half of the one after; `makeEnv()` is the suite's alone.

## Where it runs — a container locally, the runner in CI

Decided in `docs/adr/0003-builds-and-e2e-run-in-docker.md`; read it before
changing anything here.

- **On a developer's machine** the script does no work itself. It builds the
  toolchain image (`docker/Dockerfile`), starts it beside a Mongo container
  (`docker/compose.yaml`), and re-runs inside it. Seeding, `next build`,
  `next start` and Playwright all happen in the container.
- **On the CI runner** (`GITHUB_ACTIONS=true`) the work happens on the runner,
  against the same Mongo container, reached through a loopback port Docker
  picks.

Docker is therefore required for `pnpm e2e` and `pnpm build:ci` everywhere.
The gate is not part of this: `pnpm run gate` runs on the host with no
Docker, and its integration specs keep `mongodb-memory-server`
(`src/test/payload-harness.ts`).

Never start the compose file by hand, and never add a path that runs the
build or the suite on a developer's host. `pnpm build` and `pnpm start` still
exist because the container and Vercel run them; on a developer's host they
load `.env.local`, so do not run them there by hand. A working directory
with an env file at its root is refused even on the runner path, which is
what catches a developer's shell that has `GITHUB_ACTIONS=true` set.

Every run gets its own compose project, named after the command and the
process, so two runs can never share a database. The project is taken down
when the run ends and also when the launcher is told to stop — Ctrl-C,
`kill`, a closed terminal. Only a `SIGKILL` can leave one behind; remove it
with `docker compose --project-name <name> down --volumes`.

## Hermetic env — no `.env*` input, ever

Two layers, and neither may be weakened to "fix" a failure.

**The container cannot see an env file.** `.dockerignore` keeps every
secret-bearing file out of the image, the compose file has no `env_file` and
mounts nothing from the working tree except `test-results/` (written to,
never read), and compose itself is pointed at
`/dev/null` instead of a default `.env`. As a last check the script refuses to
work if the root of its copy of the tree holds an env file — the root is
where `next build` and `next start` look, and they load `.env.local` by
themselves when one is there.

**`makeEnv()` pins every env-sensitive key**, in the container and on the
runner alike: the throwaway Mongo URI, always-pass Turnstile test keys,
`SMTP_HOST=''` (forces the JSON email transport — nothing can leave the
suite), `BLOB_READ_WRITE_TOKEN=''`, and `VERCEL_ENV=''` (the suite is a
production build, and `src/lib/turnstile/verify.ts` refuses the pinned test
secret only when `VERCEL_ENV` says Vercel production — nothing around the
suite must be able to make it say so). Seeding runs via `pnpm exec tsx` so no
env file is loaded there either. Never weaken a pinned key or read `.env*`.

## Dedicated port + pre-spawn guard

The server runs on port 4310 (`E2E_PORT`), never Next's default 3000 where a
developer's `pnpm dev` (against a real DB) could listen. `assertPortFree()`
aborts if ANYTHING answers on the port — checked before setup and again
right before spawning, so probes can never pass against a foreign server.
Inside the container the port is private to it; the guard stays because the
runner path has no such wall.

## Seed BEFORE build (ISR)

The database is the only copy of Owner content (`docs/adr/0001`), so a build
against an empty one has no Site settings to render and fails. The harness
runs the Seed (`scripts/seed.ts`, the same file `pnpm seed` runs), then adds
the E2E post and the suite's one admin account (`scripts/seed-first-user.ts`,
handed `E2E_OWNER` from `harness-config.ts`), before it builds — keep it so.
The account is what gives the admin a sign-in screen for `admin.spec.ts` to
sign in through; an empty Users collection shows create-first-user instead. The pages that read the
database use ISR (`revalidate = 300`), so whatever the build saw is also what
the specs' first visit is served.

A failed setup is retried against a fresh database: a new database name on
the same Mongo container, not a new container.

## EMAIL_LOG_UNSENT log-scrape protocol

`EMAIL_LOG_UNSENT='true'` makes the JSON transport log message content; the
newsletter spec scrapes `/newsletter/confirm?token=([0-9a-f]{64})` from
`e2e-server.log` to complete the opt-in round trip. The harness's DB
readiness probe deliberately uses a NON-hex token so it can never match that
regex if the probe URL is ever logged.

`test-results/` is the one directory the container shares with the host.
Playwright's traces land there, and after the suite the harness copies
`e2e-server.log` in beside them, so a failed local run can still be diagnosed
once the container is gone.

## Async spawn only — never `spawnSync`

Every child goes through `src/lib/proc/run-child.ts`, which has no
synchronous path and is specced; do not hand-roll another `spawn` here. The
harness holds the server's piped output and must keep draining it, and a
step that hangs has to be killable: the steps `scripts/e2e.ts` starts (seed,
build, server, Playwright) spawn `detached` so a timeout signals the whole
process group, not just the `pnpm` entry point. The launcher's `docker`
commands are deliberately not detached, so Ctrl-C reaches them and the
launcher can tear the project down. The rule was learned when the harness
owned a `MongoMemoryServer` — see
`docs/lessons/testing/spawnsync-starves-owned-child-pipes.md`.

## Never run the suite against a server you didn't spawn

No pointing `E2E_BASE_URL` (or `pnpm exec playwright test`) at a dev server,
a deployed site, or anything else already running: the specs WRITE (contact
messages, newsletter subscribers). Only the harness-spawned server is safe.
