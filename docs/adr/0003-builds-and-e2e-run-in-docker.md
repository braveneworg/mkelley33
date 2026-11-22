# Builds and E2E run in Docker

`pnpm build:ci` and `pnpm e2e` each started an in-memory Mongo inside their
own process, on the host. The owner set a rule for this machine: nothing
touches the database `.env.local` names except seed commands and `pnpm dev`;
builds, E2E, and verification of any change run in Docker. Locally that means
`build:ci` and `e2e` themselves run inside containers, beside a Mongo
container, and `.env.local` is never given to them. On the CI runner they run
directly on the runner, beside a Mongo container: the runner is already a
throwaway Linux machine with no `.env.local`, so a container around the build
adds no protection there. The gate is outside the rule. It runs on the host,
on every commit and push, and its integration specs keep their in-memory
Mongo. The site is still hosted on Vercel, not on Docker.

## Considered options

- **Stay in-memory for builds and E2E.** Recommended during design and
  declined by the owner. It was already disposable and needed nothing
  installed.
- **Docker locally, in-memory on the runner.** Rejected: two database paths
  per command, each exercised in only one place.
- **Only the Mongo server in a container, builds and E2E on the host.** This
  was the first reading of the rule and it was wrong; the owner corrected it.
  A host process can still be handed `.env.local`, and `next build` loads it
  by itself.
- **The gate in a container, or its integration specs on a Mongo container.**
  Rejected: every commit and push would need the Docker daemon, and the
  integration harness already overwrites the database address before Payload
  loads, so those specs cannot reach the `.env.local` database.
- **The same containers on the runner.** Rejected: slower CI and an image
  build on every run, for no added isolation.

## Consequences

- Docker is required to run the build check and the E2E suite anywhere. The
  gate needs no Docker.
- `build:ci` and `e2e` have one database path, a Mongo container, but two
  process paths: inside a container locally, directly on the runner. A
  failure can appear in one and not the other.
- On the runner, a failed or rate-limited pull of the Mongo image turns CI
  red for a reason unrelated to the code. The owner accepted that cost for
  having one database path.
- The local containers install their own dependencies. The host's
  `node_modules` holds macOS binaries that a Linux container cannot run.
- `mongodb-memory-server` stays as a dependency, used only by the gate's
  integration specs through `src/test/payload-harness.ts`. It is removed from
  `scripts/ci-build.ts` and `scripts/e2e.ts`, along with the harness rules
  that exist only because the harness owned one; the other E2E invariants in
  `e2e/AGENTS.md` stand unchanged.
- The commands that may use the `.env.local` database are the seed commands
  (Seed, Capture, first admin account), `pnpm dev`, and `db:backup` /
  `db:restore`. Nothing else may, and no command deletes Owner content from
  it — starting over only ever happens in a container.
