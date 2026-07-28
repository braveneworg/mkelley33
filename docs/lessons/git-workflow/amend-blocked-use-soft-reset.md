# Message-only `--amend` is blocked; use a soft reset

**Symptom:** `git commit --amend` to fix nothing but the commit message dies
before the editor opens:

```text
🚫 No staged changes to commit. Please stage your changes before committing.
husky - pre-commit script failed (code 1)
```

**Root cause:** `.husky/pre-commit` asserts that something is staged. A
message-only amend stages nothing, so the guard fires even though the commit
itself is legitimate. The obvious escape, `--no-verify`, is forbidden by
`AGENTS.md`, and `git rebase -i` is unavailable in agent shells (interactive
flags are not supported).

**Rule:** rewind one commit and remake it.

```sh
git reset --soft HEAD~1   # files return to the index, working tree untouched
git commit -F - <<'EOF'
<corrected message>
EOF
```

The soft reset puts the original commit's files back in the index, so
pre-commit sees real staged changes and **every hook runs normally** —
gitleaks, lint-staged, `tsc-files`, commitlint. Nothing is bypassed. Confirm
afterwards that the tree is unchanged: `git diff <old-sha> HEAD` must be
empty.

For more than one commit, `git filter-branch --msg-filter` works
non-interactively over a range (`main..HEAD`), but it does **not** run the
`commit-msg` hook — validate the result yourself with
`pnpm exec commitlint --from main --to HEAD`, and compare tree hashes in
order to prove only messages moved:

```sh
diff <(git rev-list --pretty=%T <backup> --not main | grep -v '^commit') \
     <(git rev-list --pretty=%T HEAD      --not main | grep -v '^commit')
```

## What actually trips `footer-leading-blank`

Worth knowing before writing the message, since the fix is a reword and the
reword costs a soft reset. The conventional-commits parser reads any body
line beginning `<token>:` as the start of a footer, so an ordinary prose line
that happens to open with a word and a colon —

```text
run: `import-x/no-duplicates` merges the duplicate imports
```

— becomes a footer with no blank line above it, and the warning fires on a
message that has no footer in it at all. Nothing about the wrapping or the
line length is at fault. Start such a line with anything else (`It ran:`, or
move the colon off the front) and it parses as body.

**History:** 2026-07-26, Phase 5 — first hit fixing a `footer-leading-blank`
warning, then again stripping the trailers described in
[agents-md-outranks-plan-docs](agents-md-outranks-plan-docs.md). Hit twice
more on 2026-07-27 in PR #15, which is when the cause above was pinned down.
