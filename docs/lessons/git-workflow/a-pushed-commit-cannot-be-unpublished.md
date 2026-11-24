# A pushed commit cannot be unpublished from here

**Symptom:** on 2026-11-23 the owner asked for both backups to be kept in a
particular directory on their own machine. The path was written into source
as the default — the resolver, its spec, four script headers, the README,
`.env.example` — and into the commit message and the pull request's
description. The pull request was merged. The owner then asked for the path
to be removed from the public repository's history. `main` was rewritten the
same day, and the path is still public on the pull request's page.

**Root cause:** two separate mistakes.

- A fact about one machine was treated as a property of the project. The
  request was "store them there"; what satisfied it was a value in
  `BACKUP_DIR`, in `.env.local`, which is never committed. Making it the
  default published it. The thought "this hardcodes the owner's directory
  layout in a public repo" did occur at the time and was not said.
- Publishing was treated as reversible. Once a commit is pushed to GitHub and
  a pull request points at it, rewriting the branch does not remove it:
  - `refs/pull/<n>/head` keeps the commit, and that ref is read-only. Only
    GitHub Support can delete it;
  - the pull request's page keeps the diff, and its description keeps every
    earlier revision under "edited" until each is deleted by hand in the
    browser. There is no API for that;
  - the commit is still served by its hash for as long as that ref exists.

**Rule:**

- A value that is true of one person's machine — a directory under their
  home, a host name, a user name — goes in an env var set in `.env.local`.
  The default in source stays generic. When a request would put such a value
  in source, say so before writing it, and offer the env var.
- Before the first push of a commit, read its diff **and its message** for
  anything the owner would not put on a public page. A pull request's
  description gets the same reading. After the push it is too late to do
  cheaply.
- When asked to remove something already pushed, say at once what a rewrite
  can and cannot reach, before doing any of it.
- Push nothing built on the affected history while the owner decides. A
  branch that fixes it forward carries the old commit in its ancestry and
  shows the removed lines in its diff, so its pull request becomes one more
  permanent ref holding the very thing being removed. Prepare the fix and
  the replacement history locally, and ask.
- Rewriting `main` is the owner's decision each time, never an agent's.
  `.husky/pre-push` blocks every push to `main`; the forced push that
  replaces it skips that hook, which needs the owner's explicit yes for that
  one push. Pin it to the commit being replaced
  (`--force-with-lease=main:<old sha>`), build the replacement so its tree
  can be compared with a tree the gate has passed, and check the result on
  the remote, branch by branch.
- Never write the thing being removed into the commit, the lesson or the
  pull request that removes it.

**History:** 2026-11-23. PR #63 put the path on `main`; the owner approved
one forced push that replaced the two commits holding it. What that could
not reach — the pull request's ref and the old revision of its description —
was left to the owner and GitHub Support.
