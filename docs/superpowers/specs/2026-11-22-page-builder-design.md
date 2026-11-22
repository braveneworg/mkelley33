# Page builder — design

Date: 2026-11-22. Status: approved by owner (grilled 2026-11-22). The points
under [Open points](#open-points) are not approved yet — settle each before
the PR that depends on it.

## Problem

Almost everything a visitor reads is hard-coded. Changing a sentence on the
home page, a job on the CV, or a menu item takes a commit, the gate, and a
deploy. The one collection that did move into the CMS, Services, kept a
hard-coded twin, and the two already disagree: `/services` reads the database
while the home page reads the constant.

The owner wants to edit the whole site in the Payload admin: create Pages,
arrange Blocks on them, and change the shared identity, menus, and files —
without touching code.

## Read these first

This document does not repeat them.

- [`CONTEXT.md`](../../../CONTEXT.md) — the vocabulary: Page, Block, Fixed
  Page, Site settings, Owner content, Visitor data, Seed, Capture, Backup, CV,
  Resume.
- [ADR 0001](../../adr/0001-the-database-is-the-only-copy-of-owner-content.md)
  — the database is the only copy of Owner content; no source fallback.
- [ADR 0002](../../adr/0002-the-privacy-page-is-editable-but-guarded.md) —
  the privacy Page is editable, but guarded.
- [ADR 0003](../../adr/0003-builds-and-e2e-run-in-docker.md) — builds and
  E2E run in Docker; the gate does not.
- [The seed lesson](../../lessons/seed/seed-inputs-stay-in-the-repo.md) — a
  file the Seed uploads has not left the repo.

## Decisions (owner-approved)

### Blocks

The owner picks from the kinds the design system offers. A new kind is a PR.

| Block                              | Notes                                                 |
| ---------------------------------- | ----------------------------------------------------- |
| Hero                               |                                                       |
| Terminal                           | Rich text, optional picture with a round-portrait style |
| Chip list                          |                                                       |
| Timeline                           |                                                       |
| Link list                          |                                                       |
| Definition list                    |                                                       |
| Services grid, Services detail     | Display the shared Services records                   |
| Latest posts, Post list            | Display published Posts                               |
| Newsletter signup                  |                                                       |
| Contact form                       |                                                       |
| Picture                            | Standalone, optional caption                          |
| CV Blocks                          | As many as the CV needs; its print styling is kept    |
| Cookie inventory, Manage preferences | No editable text (ADR 0002)                         |

- The `$ command` line above a Block is an editable field on that Block.
- **Shared or typed in.** Services are shared records that Blocks display,
  because contact messages reference them. The career log on the home Page
  and the CV are typed into their own Blocks and may deliberately differ —
  the owner rejected a shared career list.

### Pages

- **Become Pages:** home, blog index, services, CV, uses, contact, privacy.
- **Stay in code:** individual post pages, the 404 and offline pages,
  newsletter confirm and unsubscribe, the feed, robots; form labels and error
  messages, email templates, consent banner text, icons, generated share
  images, and the site domain.
- **Addresses** are one level deep. A name the code already serves is
  refused — `admin`, `api`, `newsletter`, `feed.xml`, anything under `blog/`,
  and the rest of that list. Renaming a Page leaves no redirect behind; the
  admin warns when a published Page's address changes.
- **Draft, preview, publish** for Pages and for Site settings. Preview opens
  in a new tab; side-by-side live preview is not built. Versions are kept.
  Publishing revalidates immediately. Posts keep their existing hand-made
  status field.
- Each Page has its own search title and description. Share images stay
  generated, using the Page title.

### Site settings

- Name, tagline, browser title, description, social links, repo link, header
  menu, footer menu, and the Resume.
- A menu item references a Page, so a rename follows, or holds an outside
  link. The footer adds the social and RSS links by itself.
- The command palette and the sitemap list published Pages by themselves.

### Files

- The headshot moves into the Media library. Alt text stays required.
- The Resume is a PDF-only upload slot. `/michaux-kelley-resume.pdf` serves
  the current upload permanently; an empty slot hides the download button.
- Both files stop being served from `public/` and stay in the repo as Seed
  inputs.

### Seed and Capture

- One fill-only Seed command replaces `seed:services`. It creates what is
  missing and never overwrites an existing record. This is a change of
  behaviour: today's `seedServices` updates records that already exist.
- No reset command exists.
- The admin account stays with the existing `seed:first-user`.
- The first Seed is written from today's hard-coded content. Existing Posts
  arrive with the first Capture.
- Capture is run by hand by the owner. It reads production, rewrites the
  Seed files, and goes through a PR and the gate like any other change.
- Capture takes published content only: published Pages, Site settings,
  Services, published Posts, and the files they use. Drafts and version
  history are excluded.
- The seventeen privacy specs are re-pointed at the Seed's privacy content.

## Architecture

The shapes below follow from the decisions. Field-level detail belongs to
each PR's plan, written against the Payload 3 documentation at that time.

- **Pages** are a Payload collection whose body is one ordered blocks field,
  with Payload's versions and drafts turned on. **Site settings** is a
  Payload global, also with versions and drafts.
- **One registry of Block kinds.** Each kind is a Payload block definition
  paired with a Server Component that renders it. The admin's choices and the
  renderer read the same registry, so a kind cannot exist in one and be
  missing from the other.
- **Rendering.** The home route and one single-segment route under
  `src/app/(site)/` look the Page up by address through a repository and
  render its Blocks in order. The routes that stay in code keep their own
  files and win over the single-segment route; the reserved-name check at
  save time is what keeps a Page from being created underneath one.
- **Reads go through repositories** in `src/lib/repositories/`, as Services
  and Posts do today. There is no fallback to source. A missing Fixed Page
  fails the build; any other missing Page is a 404 (ADR 0001).
- **Revalidation.** Publish hooks on Pages and Site settings revalidate the
  affected addresses, in the manner of
  `src/collections/hooks/revalidate-post.ts`. A Site settings publish
  revalidates every Page, because the header and footer are on all of them.
  The existing five-minute ISR window stays as the safety net.
- **Preview** uses Next's draft mode behind Payload's preview link, and only
  for a signed-in owner. Visitors never see a draft.
- **The Resume address** is a route that serves the current upload, or a 404
  when the slot is empty.
- **Uploads** go through Payload, so files land wherever that environment's
  storage points: Vercel Blob in production, local disk in the E2E harness,
  where the blob token is pinned empty.
- **The Seed** lives in `seed/` as JSON files plus the two binary inputs. The Seed command and Capture are two ends of one module: Capture
  must be able to rewrite mechanically exactly what the Seed reads.

### Where today's content goes

The Block list was drawn from the components that exist. This is the expected
mapping; the PR 3 plan confirms it Block by Block.

| Today                                    | Becomes                                |
| ---------------------------------------- | -------------------------------------- |
| `home/hero.tsx`                          | Hero                                   |
| `home/about-beat.tsx`                    | Terminal with a round-portrait picture |
| `home/ai-toolbox-beat.tsx`               | Chip list                              |
| `home/services-beat.tsx`                 | Services grid                          |
| `home/career-beat.tsx`                   | Timeline                               |
| `home/open-source-beat.tsx`              | Link list                              |
| `home/latest-posts-beat.tsx`             | Latest posts                           |
| `home/newsletter-beat.tsx`               | Newsletter signup                      |
| `(site)/uses/page.tsx`                   | Definition lists                       |
| `(site)/services/page.tsx`               | Services detail                        |
| `(site)/blog/page.tsx`                   | Post list                              |
| `(site)/contact/page.tsx`                | Contact form, Newsletter signup        |
| `cv/cv-document.tsx`, `cv-content.ts`    | CV Blocks                              |
| `(site)/privacy/page.tsx`                | Terminal, Cookie inventory, Manage preferences |
| `site-config.ts`                         | Site settings; the domain stays in code |
| `site-nav.tsx`, `site-footer.tsx`, `command-palette.tsx` | Menus from Site settings; palette from published Pages |
| `services-content.ts`, `services-seed.ts` | The Seed                              |

## Delivery

Five PRs. Each is merged and deployed before the next starts.

1. **Docker for builds and E2E.** Locally, `build:ci` and `e2e` run inside
   containers beside a Mongo container, and `.env.local` is never given to
   them. On the runner they run directly, beside a Mongo container.
   `mongodb-memory-server` leaves both scripts and stays only for the gate's
   integration specs. `e2e/AGENTS.md`, `src/lib/e2e/harness-config.spec.ts`,
   the README, and the `testing/` row in `AGENTS.md` are updated to match.
2. **Site settings without the menus**, with draft, publish, and version
   history; the Resume upload with its permanent address; and the fill-only
   Seed.
3. **Pages and Blocks** with draft, preview, and publish; the header and
   footer menus in Site settings; the new-tab preview, for Pages and Site
   settings together; and the headshot in Media. Every page except privacy
   moves; the hard-coded content is deleted.
4. **The privacy Page** with its guards.
5. **The Capture command.**

The owner seeds production before PRs 2, 3, and 4 deploy, and runs the first
Capture after PR 5. Neither can be done by an agent: both need production
credentials, which are never read.

**Why the menus wait for PR 3.** A menu item references a Page, and Pages do
not exist until PR 3. The header and footer menus stay hard-coded through
PR 2's deploy. The owner chose this over menus that hold plain addresses in
PR 2 and are converted in PR 3, which would have built a field and a data
migration that live for one PR.

**Why the headshot and the preview wait for PR 3.** The owner decided both
on 2026-11-22. What points at the headshot is the Terminal Block's picture,
and Blocks arrive in PR 3; moving it earlier would need a lookup by filename
that PR 3 deletes. The preview is built once, for Pages and Site settings
together. Until then a draft of Site settings can be saved but not viewed on
the site.

**The reach of the Docker rule** was settled by the owner on 2026-11-22 and
is recorded in ADR 0003. The first draft of that record had it wrong: it said
only the Mongo server was a container.

## Open points

None of these blocks PR 1.

**Not discussed.**

- What a menu shows when the Page it references is unpublished or deleted.
  Only CV and uses can be, since the rest of today's menu targets are Fixed
  Pages.
- `handle` in `site-config.ts` is not in the Site settings list. It stays in
  code beside the domain unless the owner says otherwise.

## Out of scope

Side-by-side live preview; redirects on rename; nested addresses; Block kinds
the owner defines in the admin; a shared career list; a reset command; moving
Posts onto drafts and versions; capturing drafts, version history, or Visitor
data; generating the Resume from the CV; editable form labels, error
messages, email templates, or consent banner text; containerising the site
itself.
