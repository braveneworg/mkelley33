# A `>=` floor cannot express a ceiling

**Symptom:** `src/node-version.spec.ts` shipped green while enforcing the
opposite of the constraint it existed for. It asserted that `.nvmrc` was at
or above the `engines.node` floor. The actual constraint is a maximum —
Vercel's `nodejs24.x` runtime tops out at 24.15.0 — so bumping `.nvmrc` to
`v24.19.0` satisfied `>=24.15.0`, kept the suite green, and silently restored
the build/runtime skew the commit had just fixed.

**Root cause:** the work arrived as a staged one-liner lowering a floor,
`>=24.18.0` → `>=24.15.0`, and the shape of the diff was read as the shape of
the constraint. Lowering a floor and capping a ceiling produce a
character-identical edit; the diff cannot tell them apart. Only asking _why
24.15.0_ can, and that was asked after the spec was written and pushed.

**Rule:**

- Before pinning a version, establish which direction binds: is the named
  version the oldest thing that still works, or the newest thing available?
  A `>=` floor and an exact pin agree exactly until one side moves, and then
  differ silently.
- Assert against the drift the invariant is meant to prevent, not the state
  that happens to hold today. `expect(installed).toBe(floor)` fails at
  `v24.19.0`; `expect(satisfies(installed, floor)).toBe(true)` does not. Both
  pass on the current tree, which is why "it went green" proved nothing.
- Verifying red against _a_ violation is not verifying red against _the_
  violation. The first spec was dutifully proven red — by raising the floor
  above `.nvmrc`, a direction nothing would ever push it. The failure worth
  staging is the one that is actually plausible.

**Also:** the constraint existed nowhere in the repo. It lived only in the
owner's head, so no amount of reading the codebase would have surfaced it —
`docs/deploy.md` now carries it, and the spec's own docblock explains why the
two files must match rather than merely be compatible.

**History:** 2026-07-27, PR #15.
