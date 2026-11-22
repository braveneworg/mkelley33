# Builds and tests run in Docker

`pnpm build:ci` and `pnpm e2e` each started an in-memory Mongo inside their
own process, on the host. The owner set a rule for this machine: nothing
touches the database `.env.local` names except seed commands and `pnpm dev`;
everything else — builds, E2E, and verification of any change — runs in
Docker. Locally that means the build and the tests themselves run inside
containers, beside a Mongo container; it is not only the database that is
containerised. The site is still hosted on Vercel, not on Docker. On the CI
runner the database is a Mongo container too, so no command keeps an
in-memory database path anywhere.

## Considered options

- **Stay in-memory.** Recommended during design and declined by the owner. It
  was already disposable and needed nothing installed.
- **Docker locally, in-memory on the runner.** Rejected: two database paths
  per command, each exercised in only one place.
- **Only the Mongo server in a container, builds and tests on the host.**
  This was the first reading of the rule and it was wrong; the owner
  corrected it. A host process can still be handed `.env.local`, and
  `next build` loads it by itself.

## Consequences

- Docker is required to run the build check and the E2E suite anywhere.
- On the runner, a failed or rate-limited pull of the Mongo image turns CI
  red for a reason unrelated to the code. The owner accepted that cost for
  having one database path.
- The local containers install their own dependencies. The host's
  `node_modules` holds macOS binaries that a Linux container cannot run.
- `mongodb-memory-server` and the harness rules that exist only because of it
  are removed; the other E2E invariants in `e2e/AGENTS.md` stand unchanged.
- The commands that may use the `.env.local` database are the seed commands
  (Seed, Capture, first admin account), `pnpm dev`, and `db:backup` /
  `db:restore`. Nothing else may, and no command deletes Owner content from
  it — starting over only ever happens in a container.
