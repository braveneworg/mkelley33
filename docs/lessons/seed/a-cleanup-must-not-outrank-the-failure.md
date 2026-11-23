# A cleanup must not outrank the failure it cleans up after

**Symptom:** the first `pnpm seed` against the live database (2026-11-22)
ended with

```text
seed failed — MongoServerError: Unable to acquire IX lock on
'{Collection : test.resume-files}' within 5ms.
```

That was not what went wrong. Thirty lines up, Payload had logged the real
failure: Atlas refused the Site settings save with `AtlasError 8000`, "Error
determining if update will go over space quota". The lock error came from
the Seed's own cleanup, which ran next, failed as well, and replaced the
error the Seed reported.

**Root cause:** the fill uploads the Resume and then saves the Site settings
that point at it. On a failed save it deleted the upload inside the `catch`,
with a bare `await`. Two mistakes in three lines:

- A throw inside a `catch` replaces the error being handled. The cleanup's
  failure became the Seed's failure.
- It assumed a failed save had saved nothing. Payload writes a global's
  record first and its version second, so a save can fail **after** the
  record exists. Without a transaction to roll that back, the cleanup would
  have deleted an upload the saved settings pointed at.

The review had asked for this cleanup, and its spec forced the failure with
invalid data — a save that fails before writing anything. The partial
failure only a real database produces was never tried.

**Rule:**

- Cleanup in a `catch` is best effort: it gets its own `try`, and the
  original error is the one rethrown.
- Before undoing step one because step two failed, read back whether step
  two took effect. "It threw" does not mean "nothing was written".
- Failure paths a real database will not produce on demand get a unit spec
  with a fake at the boundary (`src/lib/seed/fill-seed.spec.ts`), beside the
  integration spec for the paths it will.
- Anything meant to be run against the live site gets a read-only way to
  look first. `pnpm seed:check` exists because after that failure nobody
  could say what state the database was in.

**History:** 2026-11-22, PR #56, found by the owner's first production run.
The database's own failure (Atlas's quota check timing out) was not caused
by the Seed.
