# mkelley33 — Agent & Contributor Guidelines

Last updated: 2026-07-26

Single source of truth for how to work in this repository — for humans and for
every AI coding agent. Tool-specific files (e.g. `CLAUDE.md`) defer to this
document. Directory-specific rules live in nested `AGENTS.md` files and
hard-won lessons in `docs/lessons/` — load both on demand as described below;
never preload everything.

## How to work

- Every edit happens in a worktree branched off freshly-fetched `origin/main`
  (`.claude/worktrees/<type>-<name>`, branch renamed to `<type>/<name>`) —
  never in the main checkout.
- TDD is non-negotiable: write the test first, watch it fail, then implement.
  Every feature and bug fix ships with tests.
- Quality over speed. These guidelines are binding — when code can't comply,
  say so rather than silently working around them.
- Reuse before you create — search for an existing component, type, field, or
  util before adding one. Server Components, Server Actions for mutations, and
  named exports are the default posture.
- Gate before committing — all four must pass:
  `pnpm run typecheck && pnpm run test:run && pnpm run lint && pnpm run format`.

## Hard constraints

1. **E2E / database isolation** — before touching E2E, the DB, builds, dev
   servers, seed scripts, or anything that reads the environment, read
   [`e2e/AGENTS.md`](e2e/AGENTS.md) in full. When in doubt there, stop and ask.
2. **Secrets and `.env*`** — never read, print, copy, decrypt, or pipe the
   contents of `.env*`, `.envrc`, `*.pem`, `*.key`, `id_*`, `.aws/credentials`,
   `.npmrc`, `~/.config/gh/hosts.yml`, or any secret-bearing file — with any
   tool, even piped through `head`/`wc` or redirected; running the command
   captures the value regardless. Never quote or log any value from them, even
   partially; never run `git diff`/`show`/`log -p`/`grep` on paths that may
   contain secrets without confirming the path is safe. Treat all `.env*` as
   production secrets (gitignored / "dev only" does not make them safe);
   refuse pasted `.env` content. Redact to `***` any env var matching
   `*_URL`, `*SECRET*`, `*TOKEN*`, `*KEY*`, `*PASSWORD*`, `*PASSWD*`,
   `*CREDENTIAL*`, `*DSN*`, `*CONNECTION*` before it could appear in output.
   If a task "needs" a secret value, ask for a placeholder. If a secret (even
   partial) appears in any output or input: stop, tell the user it must be
   rotated, do not repeat it, and wait.

## Directory guides (load on demand)

Before working under a directory, read its `AGENTS.md`:

| File                             | Covers                                                              |
| -------------------------------- | ------------------------------------------------------------------- |
| [`src/AGENTS.md`](src/AGENTS.md) | Architecture, TypeScript rules, data fetching, unit testing, naming |

## Lessons (load on demand)

Hard-won, repo-specific lessons live in `docs/lessons/<category>/` — one file
per lesson. Never preload them all. Before starting work that matches a
category, read every file in that category's directory, recursing into any
subdirectories:

| Category        | Load before                                                 |
| --------------- | ----------------------------------------------------------- |
| `git-workflow/` | branching, committing, pushing, PRs, code review            |
| `testing/`      | test harnesses, E2E, mongodb-memory-server, child processes |

When corrected — or when you catch your own mistake — add the lesson as a new
file in the matching category (create a new category directory if none fits)
before continuing, so it never happens again.

## Stack

Versions track `package.json` — update this block when they change.

- TypeScript 6 (strict), Node 24 (from `.nvmrc`, never global), pnpm 11 —
  `pnpm exec` for CLI tools (`prisma`, `tsx`, …).
- Next.js 16 (App Router, Turbopack dev, webpack build), React 19.

## Commands

```bash
pnpm run dev                  # Dev server (Turbopack)
pnpm run build                # Production build (webpack)
pnpm run test                 # Unit tests once (test = watch mode)
pnpm run typecheck            # tsc on tracked types
pnpm run lint                 # ESLint check + auto-fix (--max-warnings 0)
pnpm run format               # Prettier write (format:check = no write)
```

## Commits & git hooks

- Conventional Commits, enforced by commitlint: header ≤50 chars INCLUDING the
  `type(scope): ` prefix and gitmoji (counts as 2); body/footer lines ≤72.
  Format `type(scope): <gitmoji> subject` — `feat: ✨`, `fix: 🐛`,
  `refactor: ♻️`, `perf: ⚡`, `docs: 📝`, `test: ✅`, `chore: 🔧`, `style: 🎨`.
  Pick the type accurately: commitlint enforces the format, and the type is
  what a release tool would read to compute a version bump and `CHANGELOG.md`.
  No such tool is wired up yet — there is no semantic-release, changesets, or
  release workflow — so today the type buys readable history and a clean
  changelog whenever one is generated.
- Never commit or push to `main`; never bypass hooks with `--no-verify`; never
  add AI attribution / `Co-authored-by` lines. Atomic commits when working
  autonomously.
- Husky: **pre-commit** blocks `main`, runs gitleaks, lint-staged, and
  `vitest --changed`; **pre-push** requires up-to-date with `origin/main`,
  rejects WIP/`fixup!` commits, runs `tsc --noEmit`, lint, and
  `test:coverage:check`; **post-merge** reinstalls deps / regenerates Prisma
  when the lockfile or schema changed.

## Conventions

- Secure defaults always (CORS, cookie flags, rate limits); least privilege;
  validate and sanitize all external input. Config and secrets in env vars —
  never hardcoded. Auth cookies are `httpOnly`/`secure`/`sameSite`; web
  storage only for non-sensitive client state.
- Dependencies: reuse an existing one before adding (check `package.json`);
  weigh bundle size, maintenance, security, and MPL-2.0 compatibility.
- Add the MPL header from `HEADER.txt` to every new source file, above any
  `'use client'` directive or `@vitest-environment` docblock and below a
  shebang. `src/license-header.spec.ts` enforces this across every tracked
  source file, so a missing header fails the suite rather than going
  unnoticed; generated files are exempted by name there. Markdown headers are
  not required — no `.md` in this repo carries one.
- Agent-authored markdown goes where its kind belongs: lessons in
  `docs/lessons/<category>/`, plans in `docs/superpowers/plans/`, specs in
  `docs/superpowers/specs/`, skill config in `docs/agents/`. Only output with
  no such home belongs in `docs/auto-generated/`, which is created on first
  use. Never author docs from files outside this repo, and never commit
  generated files or build artifacts.
- When editing a line, confirm nearby comments are still accurate.
- Refactor with confidence — tests, types, and review catch mistakes. Update
  or remove tests to match the new structure; no orphaned tests or code.

## Agent skills

Per-repo config for the engineering skills (`to-tickets`, `triage`, `to-spec`,
`wayfinder`, …). Skills resolve these pointers at runtime.

### Issue tracker

GitHub Issues on `braveneworg/mkelley33`, driven via the `gh` CLI.
See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, `wontfix`), applied as GitHub issue labels.
See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` at the root is the glossary; decisions live in
`docs/adr/`. Neither exists yet, and that is expected — `/domain-modeling`
creates them lazily when a term or decision is actually resolved, so proceed
silently rather than treating their absence as a gap. See
`docs/agents/domain.md`.
