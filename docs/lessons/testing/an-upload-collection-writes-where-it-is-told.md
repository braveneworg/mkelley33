# An upload collection writes to the working tree unless told otherwise

**Symptom:** on 2026-11-23 the `feat-privacy-page` worktree held a `media/`
directory with 436 copies of the Seed's headshot, `headshot-1.webp` through
`headshot-435.webp`. Nothing failed. The directory is ignored by git, so no
`git status` ever showed it.

**Root cause:** the Media collection was declared `upload: true`. Payload
then writes uploads to a directory named after the collection, under the
working directory. The integration harness (`src/test/payload-harness.ts`)
makes a directory for each spec's uploads and empties it between tests, and
its comment says uploads "land in a directory of this spec's own" — true for
the Resume's collection, which reads `UPLOADS_DIR`, and false for Media,
which was added in PR 3 without it. Every test that filled a database left
one more headshot behind, and Payload named each around the files already
there, so no spec could have asserted a file name either.

**Rule:**

- Every upload collection sets `staticDir` from `UPLOADS_DIR`, as
  `resume-files.ts` and `media.ts` do. `upload: true` is never enough.
- A harness comment that promises isolation is a claim about every
  collection. When adding an upload collection, add the spec that looks for
  its file where the harness put it
  (`src/lib/seed/fill-seed.int.spec.ts`, "keeps the pictures it uploads
  out of the working tree"). Ask Payload for the directory: the suite
  clears `process.env` between tests, so the variable is gone by then.
- An ignored directory hides leaks. After a run of the gate,
  `git status --ignored` is the check.

**History:** 2026-11-23, found while starting PR 5 of the page builder, by
listing a merged worktree's ignored files before removing it.
