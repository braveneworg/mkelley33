# A spec with no imports is a script, and scripts share one global scope

**Symptom:** `pnpm typecheck` failed with `TS2451: Cannot redeclare
block-scoped variable 'find'` (and `importFresh`) across
`src/lib/repositories/posts.spec.ts` and the new
`src/lib/repositories/comments.spec.ts` — plus cascading `TS2339` errors
where one spec's `importFresh` resolved to the _other_ module's type. Both
files were individually correct, and **pre-commit passed on both commits**.

**Root cause:** Vitest globals mean a spec can be written with zero top-level
`import`/`export` statements (`vi`, `describe`, `expect` are ambient;
`importFresh` uses dynamic `import()`, which does not count). TypeScript
treats a file with no module syntax as a _script_, and every script shares
one global scope — so the second spec that copied the `const find = vi.fn()`
pattern collided with the first, and inference bled between files.
`posts.spec.ts` had been the only such script, so the trap was invisible
until a second one appeared. The pre-commit hook's `tsc-files` runs on the
staged subset and did not surface it; only the full `tsc --noEmit` did.

**Rule:**

- A spec that would otherwise have no top-level imports must anchor itself
  as a module. The idiomatic shape here also improves the types: import the
  module under test as a type and annotate the re-importer —

  ```ts
  import type * as postsRepo from '@/lib/repositories/posts';

  const importFresh = async (): Promise<typeof postsRepo> => {
    vi.resetModules();
    return import('@/lib/repositories/posts');
  };
  ```

  A type-only import is erased at runtime but still makes the file a module.

- Copying a spec's structure copies this hazard: if the template has no
  imports, the copy collides with the template. Check for top-level module
  syntax whenever cloning a node-env spec that mocks its module graph.
- A green pre-commit is not a green `pnpm typecheck` — `tsc-files` sees the
  staged files, not the program. Run the full gate before calling a branch
  done (which the pre-push hook enforces anyway).

**History:** 2026-08-02, `feat/blog-comments` — `comments.spec.ts` copied the
`posts.spec.ts` importFresh pattern; two commits landed green before the
first full `tsc --noEmit` failed. Same session also re-proved
[never-trust-a-wrapped-exit-status](../git-workflow/never-trust-a-wrapped-exit-status.md)
by piping that failing `tsc` through `tail`.
