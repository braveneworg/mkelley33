# Staging only your change when another session holds the file

**Symptom:** a sweep (license headers, an import removal) touches a file that
another concurrent agent session has uncommitted work in. `git add <file>`
would commit their unfinished work under your message; skipping the file
leaves the committed tree inconsistent — in the header sweep's case, five
source files would have landed without headers in the very commit that added
the rule enforcing them, failing CI on the pushed branch.

**Root cause:** `git add` is all-or-nothing per file, and `git add -p` needs
an interactive shell agents do not have.

**Rule:** build the blob you want and write it straight into the index.

```sh
git show "HEAD:$f" > /tmp/candidate        # start from committed content
# …apply only your change to /tmp/candidate…
sha=$(git hash-object -w /tmp/candidate)
git update-index --cacheinfo "100644,$sha,$f"
```

Their edits stay in the working tree, unstaged and untouched; your line lands
alone. Verify before committing:

- `git diff --cached` shows only your change,
- the staged blob passes `eslint` and `prettier --check`,
- `git status` after the commit still shows their work, and `git stash list`
  is empty (lint-staged stashes unstaged changes while it runs).

**Trap:** a hand-built blob never passes through `eslint --fix`, so
formatting the working tree got for free is missing. Removing an import line
_and_ its trailing blank line collapsed two import groups and would have
failed `import-x/order` on that commit — the working-tree copy looked fine
because `--fix` had already repaired it. **Lint the candidate blob itself**,
not the file on disk.

**Also:** check whether the other session is idle (file mtimes) before
partial staging, since lint-staged's stash/restore cycle races with a live
writer.

**History:** 2026-07-26, Phase 5 — MPL header sweep and the Vitest-globals
conversion, both landing beside an active session's Task 8 work.
