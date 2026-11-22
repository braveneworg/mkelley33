# Builds and tests use a dockerized Mongo

`pnpm build:ci` and `pnpm e2e` each started an in-memory Mongo inside their
own process. The owner set a rule for this machine: nothing touches the
database `.env.local` names except seed commands and `pnpm dev`; everything
else — builds, E2E, and verification of any change — runs against a Mongo
container. Only the database is containerised; the site is still built on the
host and hosted on Vercel. We applied the rule to the CI runner as well, so
each command has exactly one way of starting its database and a pass locally
means the same thing as a pass on the runner.

## Considered options

- **Stay in-memory.** Recommended during design and declined by the owner. It
  was already disposable and needed nothing installed.
- **Docker locally, in-memory on the runner.** Rejected: two database paths
  per command, each exercised in only one place.

## Consequences

- Docker is required to run the build check and the E2E suite anywhere.
- `mongodb-memory-server` and the harness rules that exist only because of it
  are removed; the other E2E invariants in `e2e/AGENTS.md` stand unchanged.
- The commands that may use the `.env.local` database are the seed commands
  (Seed, Capture, first admin account), `pnpm dev`, and `db:backup` /
  `db:restore`. Nothing else may, and no command deletes Owner content from
  it — starting over only ever happens in a container.
