# `git worktree add` with a relative path resolves against the CWD

**Symptom:** `git worktree add .claude/worktrees/chore-license-field …` run
while the shell was still `cd`'d into
`.claude/worktrees/feat-favicon/` created the new worktree _nested inside
the old one_ —
`.claude/worktrees/feat-favicon/.claude/worktrees/chore-license-field/` —
instead of beside it at the repo root. Git happily registers the nested
path; nothing warns. The mistake surfaces later, when removing the outer
worktree would take the inner one with it, or when tooling assumes the
`.claude/worktrees/<type>-<name>` layout and cannot find the tree.

**Root cause:** worktree paths are ordinary filesystem paths — relative
ones resolve against the current working directory, not against the
repository root. Agent sessions routinely end a compound command `cd`'d
into the previous task's worktree, so the "usual" relative path silently
means somewhere else.

**Rule:** always pass the absolute path when adding a worktree, anchored at
the main checkout:

```sh
git worktree add /Users/…/repo/.claude/worktrees/<type>-<name> -b <type>/<name> origin/main
```

or `cd` to the main checkout in the same compound command _before_ the
`worktree add`. After creating, `pwd` (or `git worktree list`) to confirm
the tree landed at the expected depth.

**Cleanup if it happens:** `git worktree remove --force <nested-path>`
(force because `pnpm install` has already dirtied it with ignored files),
delete the branch, and recreate at the correct path — the branch itself is
untainted, only its checkout location was wrong.

**History:** 2026-08-01, caught immediately after creation during the
license-field fix, cost one remove/recreate cycle.
