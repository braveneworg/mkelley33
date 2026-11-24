# A full Docker disk looks like a browser crash

**Symptom:** `pnpm e2e` (2026-11-23) failed eight to eighteen of its 25
tests, differently each run, always starting with the second:

```text
Error: page.goto: Target page, context or browser has been closed
```

Each failure took about 150 ms. The tests that make plain requests passed,
and after a while the browser tests passed again too. The server log showed
`Failed to write image to cache … could not be tracked by lru cache`.
Nothing named a disk.

**Root cause:** the Docker VM's disk was full — 220 MB free of 58 GB.
Chromium cannot start without room for its profile, and Next's image
optimizer cannot write its cache. Every run of the harness builds the
toolchain image from the working tree, and each build leaves layers in
Docker's build cache: 14.6 GB of it, none in use, after a day of runs. The
harness removes its containers, volumes and image when it ends, and the
build cache is none of those.

Two wrong turns came first. Running the gate at the same time was blamed,
and then memory. What settled it was running the suite on untouched `main`
in a throwaway worktree: it failed the same way, so the change under test
was not the cause.

**Rule:**

- When browser tests die at once with "browser has been closed", look at
  the disk before the code:
  `docker run --rm alpine df -h /` and `docker system df`.
- `docker builder prune -f` frees the build cache. It removes nothing but
  cache: no image, volume or container.
- When a suite fails in a way the change cannot explain, run it on `main`
  before reading the diff again. Remove the worktree afterwards.
- Do not run the gate and the E2E harness at the same time, and do not
  wrap a run in `; echo` when its exit status is the answer — see
  `docs/lessons/git-workflow/never-trust-a-wrapped-exit-status.md`.

**History:** 2026-11-23, PR 5 of the page builder. The harness does not yet
clear the cache it fills; that is a change of its own.
