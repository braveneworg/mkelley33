# Pre-push skips the gate when no `.ts`/`.tsx` changed

**Symptom:** `fb6e66e` changed `engines.node` in `package.json` from
`>=24.22.1` to `^24.22.1` and was pushed with every local hook green. Two
cases in `src/node-version.spec.ts` were red the moment the commit existed:
the spec pins the exact textual form of that field. The failure was reported
by the owner afterwards, not caught before the push.

**Root cause:** `.husky/pre-push` runs `pnpm gate` only when the pushed range
touches a `.ts` or `.tsx` file. Its log for that push reads:

```text
📦 No .ts or .tsx files changed — skipping the gate.
```

Pre-commit did not cover it either — `vitest --changed` follows the import
graph, and it printed `No source files changed, skipping tests`. But the
repo-policy specs at the `src/` root do not import what they check. They
`readFileSync` it: `package.json`, `mise.toml`, `vercel.json`,
`pnpm-workspace.yaml`, the workflow YAML, the husky hooks. A change to any of
those is invisible to both hooks and is exactly what those specs exist to
judge.

The skip was noticed and reported at the time ("gate did not run locally"),
and then nothing was done about it. Naming an unverified state is not the
same as verifying it.

**Rule:**

- A commit that touches a non-TypeScript file a policy spec reads gets
  `pnpm run gate` run by hand before the push. The hook will not do it.
- To find the specs that judge a file, grep for its name:
  `grep -rln "package.json" src/*.spec.ts`. Run at least those before
  committing; the gate before pushing.
- "The hooks passed" is evidence only about what the hooks ran. Read
  `${TMPDIR:-/tmp}/husky-pre-push.log` — a skip is a single line and looks
  like a pass from the outside, because the hook's output never reaches a
  non-TTY caller.

**Open question:** whether the hook should stop skipping. The skip trades
push latency on docs-only branches for this hole; CI still runs the full gate
on every push, so the hole costs a red PR, not a bad deploy. Not changed
here — it is the owner's call.

**History:** 2026-11-16, PR #53. Fixed forward by teaching the spec the caret
form. See
[a-floor-cannot-express-a-ceiling](../testing/a-floor-cannot-express-a-ceiling.md)
for why that spec pins the text of the field at all.
