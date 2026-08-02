# mkelley33.com

The personal site of [Michaux Kelley](https://mkelley33.com) — full-stack
engineering, AI at the terminal. A terminal-aesthetic portfolio, blog, and
newsletter built with Next.js and Payload CMS, deployed on Vercel.

## What the site is

The public site presents Michaux's work as a full-stack engineer with 10+
years of production React, Next.js, and Node.js experience, deployed forward
with AI tooling (Claude Code, MCP). Its pages:

- **Home** — hero plus "beats": about, AI toolbox, services, career history,
  open source, latest posts, and a newsletter signup.
- **Blog** (`/blog`) — posts authored in Payload's Lexical rich-text editor,
  with Shiki syntax highlighting and RSS/Atom/JSON feeds (`/feed.xml`).
- **Services** (`/services`) — consulting offerings, seeded and managed
  through the CMS.
- **CV** (`/cv`) and **Uses** (`/uses`) — resume and tooling pages.
- **Contact** (`/contact`) — a form protected by Cloudflare Turnstile that
  stores submissions and sends email via SMTP.
- **Newsletter** (`/newsletter`) — double-opt-in subscribe flow with confirm
  and unsubscribe pages.
- **Admin** (`/admin`) — the Payload CMS admin panel for managing posts,
  services, media, subscribers, and contact submissions.

The site is a PWA (Serwist service worker with an offline page), ships a
command palette (`⌘K`), supports light/dark themes, and tracks conversions
with Google Analytics and Vercel Analytics.

## Tech stack

- **Framework**: Next.js 16 (App Router, Server Components, ISR) on React 19
- **CMS**: Payload 3 with MongoDB (`@payloadcms/db-mongodb`) and Vercel Blob
  for media storage
- **Styling**: Tailwind CSS v4 (CSS-first tokens), `motion` for animation
- **Forms**: React Hook Form + Zod, Cloudflare Turnstile anti-spam
- **Email**: Nodemailer over SMTP
- **Testing**: Vitest (unit, with coverage thresholds) and Playwright (E2E
  against a hermetic in-memory MongoDB harness)
- **Tooling**: TypeScript strict, ESLint 9 flat config, Prettier, Husky +
  lint-staged + commitlint, pnpm

## Getting started

### Prerequisites

- **Node 24.15.0** — pinned by [`.nvmrc`](.nvmrc) and `engines` in
  `package.json` (capped at the Vercel runtime version; see
  [`docs/deploy.md`](docs/deploy.md) before raising it)
- **pnpm ≥ 11.17.0** (`corepack enable` or install directly)
- A **MongoDB** database (local or hosted) for local development

### Setup

```sh
pnpm install
cp .env.example .env.local   # then fill in values
```

`.env.local` needs the variables named in
[`src/lib/deploy/env-manifest.ts`](src/lib/deploy/env-manifest.ts) — the
single source of truth the deploy preflight audits: `DATABASE_URL`,
`PAYLOAD_SECRET`, `CONTACT_TO`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`,
`SMTP_USER`, `SMTP_PASS`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, and
`TURNSTILE_SECRET_KEY`. Treat every `.env*` file as production secrets:
never commit, paste, or log their contents.

Seed the database, then start the dev server:

```sh
pnpm seed:first-user   # create the initial Payload admin user
pnpm seed:services     # seed the services shown on /services
pnpm dev               # http://localhost:3000, admin at /admin
```

## pnpm scripts

### Develop & build

| Script     | What it does                                                                         |
| ---------- | ------------------------------------------------------------------------------------ |
| `dev`      | Start the Next.js dev server on port 3000.                                           |
| `build`    | Production build: `next build`, then `serwist build` to generate the service worker. |
| `build:ci` | CI build wrapper (`scripts/ci-build.ts`) used by the GitHub Actions pipeline.        |
| `start`    | Serve the production build locally (run `build` first).                              |

### Quality gate

| Script                | What it does                                                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gate`                | **The** pre-merge check: `format:check` + `typecheck` + `lint:check` + `test:coverage:check`. Must pass before every commit; pre-push and CI run the same script. |
| `format:check`        | Prettier in check mode over TS/JS/JSON/CSS/Markdown.                                                                                                              |
| `format`              | Prettier in write mode (fixes formatting).                                                                                                                        |
| `typecheck`           | `tsc --noEmit` against the strict TypeScript config.                                                                                                              |
| `lint:check`          | ESLint with zero warnings tolerated, no autofix.                                                                                                                  |
| `lint`                | Same ESLint run with `--fix`.                                                                                                                                     |
| `test:coverage:check` | Full Vitest run with coverage, failing under the configured thresholds.                                                                                           |

### Tests

| Script          | What it does                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test`          | Vitest in watch mode with quiet dot reporter.                                                                                                                                   |
| `test:run`      | Single Vitest pass, no watch.                                                                                                                                                   |
| `test:watch`    | Vitest watch mode with full output.                                                                                                                                             |
| `test:ui`       | Vitest browser UI for exploring the suite.                                                                                                                                      |
| `test:coverage` | Single Vitest pass with a coverage report.                                                                                                                                      |
| `e2e`           | **The only supported way to run E2E**: builds and serves the site against an in-memory MongoDB on port 4310, then runs Playwright. Read [`e2e/AGENTS.md`](e2e/AGENTS.md) first. |
| `e2e:test`      | Raw `playwright test` — used _by_ the harness; never point it at a running server yourself (the specs write data).                                                              |

### Database & seeding

| Script            | What it does                                                           |
| ----------------- | ---------------------------------------------------------------------- |
| `db:backup`       | Dump the database configured in `.env.local` (`scripts/db-backup.ts`). |
| `db:restore`      | Restore a previously created dump (`scripts/db-restore.ts`).           |
| `seed:first-user` | Create the initial Payload admin user if none exists.                  |
| `seed:services`   | Seed the `services` collection rendered on `/services`.                |

### Code generation & misc

| Script               | What it does                                                     |
| -------------------- | ---------------------------------------------------------------- |
| `payload`            | The Payload CLI (migrations, admin utilities).                   |
| `generate:types`     | Regenerate Payload TypeScript types from the collection configs. |
| `generate:importmap` | Regenerate the Payload admin import map.                         |
| `generate:icons`     | Regenerate PWA/app icons from the source image.                  |
| `prepare`            | Husky bootstrap; runs automatically on `pnpm install`.           |

## Testing

Unit specs live beside their source as `*.spec.ts(x)` and run with Vitest;
`describe`/`it`/`expect`/`vi` are globals. Several specs are repo policy
enforced as tests — MPL license headers, the gate script's contents, git
hook behavior, Node version pins — so the suite failing on a "docs-only"
change usually means a real invariant broke.

E2E runs only through `pnpm e2e`: the harness seeds an in-memory MongoDB,
builds, serves on a dedicated port, and never reads `.env*`, so nothing can
touch a real database or send real email. The invariants are documented in
[`e2e/AGENTS.md`](e2e/AGENTS.md) — read it in full before changing anything
under `e2e/`, the harness, or seed scripts.

## Deployment

Every push to `main` that passes the `ci` and `e2e` jobs deploys to
production via `vercel deploy --prod`, after a preflight audits the Vercel
env against the manifest. Vercel builds the artifact — the runner never
does. Setup, secrets, and the reasoning live in
[`docs/deploy.md`](docs/deploy.md). Google Analytics setup is documented in
[`docs/auto-generated/google-analytics-setup.md`](docs/auto-generated/google-analytics-setup.md).

## Contributing & further docs

[`AGENTS.md`](AGENTS.md) is the single source of truth for how to work in
this repo — worktree-per-change workflow, TDD, Conventional Commits
(format details in
[`docs/lessons/git-workflow/commit-format.md`](docs/lessons/git-workflow/commit-format.md)),
and the hard constraints around secrets and E2E isolation. Directory-level
guides go deeper:

- [`src/AGENTS.md`](src/AGENTS.md) — architecture, TypeScript rules, unit
  testing, naming
- [`src/app/AGENTS.md`](src/app/AGENTS.md) — components, forms, styling,
  accessibility
- [`src/lib/AGENTS.md`](src/lib/AGENTS.md) — the server layer
- [`e2e/AGENTS.md`](e2e/AGENTS.md) — E2E harness invariants
- [`docs/lessons/`](docs/lessons/) — hard-won, repo-specific lessons by
  category

## License

[MPL-2.0](LICENSE). Every source file carries the MPL header from
[`HEADER.txt`](HEADER.txt), enforced by `src/license-header.spec.ts`.
