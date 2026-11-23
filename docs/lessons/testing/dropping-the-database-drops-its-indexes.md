# Dropping the database drops its indexes

**Symptom:** the first integration spec for Pages (2026-11-23) asserted that
a second Page at a taken address is refused. It failed: the second create
succeeded, although the `slug` field is `unique: true`.

**Root cause:** `reset()` in `src/test/payload-harness.ts` empties the
database between tests with `dropDatabase()`. That removes every index too.
Mongoose builds indexes once, when Payload boots, so from the first reset on
no `unique: true` field was enforced for the rest of the file. Every earlier
spec had passed only because none of them tested a duplicate after a reset.

**Rule:**

- A harness that resets by dropping must rebuild the indexes afterwards.
  `reset()` now calls `createIndexes()` on every collection.
- When a spec about a database constraint passes or fails unexpectedly,
  check that the constraint exists in the test database before reading the
  application code.

**History:** 2026-11-23, PR 3. The failing spec was written before the
collection, which is the only reason the gap showed.
