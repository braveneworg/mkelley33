# Commit message format

Moved from the root `AGENTS.md` so it loads with the git-workflow lessons
instead of in every session. Commitlint (via the husky `commit-msg` hook,
config in `commitlint.config.mjs`) enforces this mechanically; this file
exists so the first attempt passes.

- Header ≤50 chars INCLUDING the `type(scope): ` prefix and gitmoji (the
  emoji counts as 2); body/footer lines ≤72.
- Format `type(scope): <gitmoji> subject` — `feat: ✨`, `fix: 🐛`,
  `refactor: ♻️`, `perf: ⚡`, `docs: 📝`, `test: ✅`, `chore: 🔧`,
  `style: 🎨`.
- Pick the type accurately: commitlint enforces the format, and the type is
  what a release tool would read to compute a version bump and `CHANGELOG.md`.
  No such tool is wired up yet — there is no semantic-release, changesets, or
  release workflow — so today the type buys readable history and a clean
  changelog whenever one is generated.
