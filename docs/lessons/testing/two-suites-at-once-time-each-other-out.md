# Two suites at once time each other out

**Symptom:** on 2026-11-25 the pre-commit hook failed twice and the gate
once, each time on two or three integration tests with
`Error: Test timed out in 5000ms.` — and on different tests each time: the
Seed's fill, Capture, the subscribers repository. None had been touched.
Rerun a few minutes later with nothing changed, all of them passed.

**Root cause:** another agent session was running its own gate in another
worktree of this repository. Each suite starts Vitest on three quarters of
the cores, and every integration spec boots Payload against its own
in-memory MongoDB; two of them together oversubscribe the machine. The
load average was 13 at the worst of it. `testTimeout` is 5 seconds, and a
test that fills a database from the committed Seed takes 1–3 seconds on a
quiet machine, so it does not take much.

The first guess was that the change under test had made the fill slower.
Timing the same test on `origin/main` in a throwaway worktree ruled that
out: the two were within the noise of each other.

**Rule:**

- A timeout that moves from test to test between runs is the machine, not
  the test. Look before rerunning: `uptime`, then
  `ps -Ao pcpu,etime,command -r | head` — another worktree's `vitest` or
  `next build` in that list is the answer.
- Wait for it rather than race it. A background command that loops until
  `pgrep -f "worktrees/<other>/.*vitest"` has found nothing for twenty
  seconds, and then runs the gate, costs no attention.
- Do not raise `testTimeout` or retry until it passes to get a commit
  through. If a change is suspected of slowing a test, measure the same
  test on `origin/main` in a worktree of its own and compare.
- The E2E harness loads the machine the same way. Do not start the gate
  while `pnpm e2e` is still running, in this session or another.

**History:** 2026-11-25, links in the CV (PR #66). Cost three failed runs
of about four minutes each before the other session's processes were
noticed.
