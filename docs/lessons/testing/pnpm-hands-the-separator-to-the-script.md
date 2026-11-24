# pnpm hands the `--` separator to the script

**Symptom:** `scripts/db-restore.ts` documented its explicit form as
`pnpm run db:restore -- <archive>` and read the path from `process.argv[2]`.
Run that way it answered

```text
db:restore cannot read --
```

The explicit form had never worked. Only the default — the newest archive —
did, and that is the only one that had been run. The fault was found on
2026-11-23 while `scripts/media-restore.ts` was being written from the same
pattern, by running the documented command once with a path that did not
exist.

**Root cause:** pnpm does not consume the `--` between its own arguments and
a script's. It passes it on, so the script's arguments are
`['--', '<archive>']` and the first one is the separator. `npm run` strips
it, which is where the habit of writing `--` comes from. Nothing in the unit
suite could see this: the pure decisions were specced, and the one line that
read `process.argv` sat in the wrapper, which no spec runs.

**Rule:**

- A script started with `pnpm run` that takes an argument reads it with
  `requestedPath` from `src/lib/db-backup.ts`, which accepts both spellings.
  Indexing `process.argv` is only right for a script that is never started
  that way (`scripts/check-deploy-env.ts`, run with `pnpm exec tsx`).
- Reading an argument is a decision, not plumbing. It goes in the specced
  module with the other pure decisions, not in the wrapper.
- Every invocation a doc comment or the README shows gets run once, as
  written, before it is committed. A restore command is read for the first
  time on the day something has been lost.
- A failing path is the cheap way to do that: an argument that names nothing
  exercises the argument handling and stops before anything is touched.

**History:** 2026-11-23, the media backup PR. `db:restore` had carried the
fault since it was written; fixed in the same PR, in a commit of its own.
