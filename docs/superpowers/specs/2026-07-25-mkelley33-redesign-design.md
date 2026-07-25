# mkelley33.com Redesign — Design Spec

Date: 2026-07-25
Status: Approved pending final user review
Elicited via visual companion session (mockups in `.superpowers/brainstorm/9574-1785010194/content/`)

## 1. Overview

Rebuild mkelley33.com from scratch as a professionally designed, modern programming
blog and consulting site presenting Michaux Kelley as a seasoned full-stack AI
forward deployed engineer. Greenfield repo (this one), deployed on Vercel as a PWA
at mkelley33.com. The existing site's 4 blog posts are preserved with identical
slugs; all other content is rewritten from the current site + resume.

Success criteria:

- Looks nothing like the current site; reads as intentionally designed.
- Mobile-first, excellent on desktop.
- Light + dark themes: system preference, falling back to light, manual toggle.
- WCAG 2.1 AA in both themes; Lighthouse 90+ across categories.
- All blog URLs from the old site continue to resolve (`/blog/<same-slugs>`).

## 2. Visual identity — "Terminal Phosphor" (Hybrid depth)

Chosen from three directions (Editorial Ink, Terminal Phosphor, Product Gradient);
depth chosen as **Hybrid**: terminal chrome everywhere it is *felt*, readable
typography wherever the user reads or converts.

### Palette

| Token             | Dark (default aesthetic)          | Light ("paper terminal", the no-preference fallback) |
| ----------------- | --------------------------------- | ---------------------------------------------------- |
| `--bg`            | `#0b0f14` + faint blueprint grid  | warm off-white `#f4f7f5` + faint grid                |
| `--surface`       | `#10161d`                         | `#ffffff`                                            |
| `--border`        | `#223140`                         | `#d8e2dc`                                            |
| `--text`          | `#d7e2e9`                         | `#17211c`                                            |
| `--text-muted`    | `#7d93a5`                         | `#5c6f66`                                            |
| `--accent`        | phosphor green `#46e08a`          | deep green `#0d9155`                                 |

All pairings AA-checked at their used sizes. Light mode is a first-class design,
not an inversion — it ships polished because it is the fallback.

### Typography

- **JetBrains Mono** — nav, prompts, headings, breadcrumbs, code, labels.
- **Inter** — body prose, service descriptions, form help text.
- Fonts self-hosted via `next/font` (no external font requests; PWA-friendly).

### Terminal vocabulary (used consistently)

Nav logo `~/mkelley33`; links `./home ./blog ./services ./cv ./contact`
(`/uses` is reachable via ⌘K + footer only, not top nav); breadcrumbs as `$ cat …`;
section headings as commands (`$ ls ./services`, `$ git log --career`);
theme toggle `◐`; blinking block cursor accents; 404 = "command not found".

### Motion language

- Hero: typewriter `$ whoami` sequence, blinking cursor (CSS-only blink).
- Scroll-triggered section reveals with Motion (motion.dev) springs + staggers.
- CSS-only: cursor blink, link underline draws, subtle scanline shimmer.
- Magnetic hover on primary CTAs; ⌘K palette open/close spring.
- Everything gated behind `prefers-reduced-motion: reduce` (instant states).

## 3. Site map & pages

```
/            Home — narrative scroll (beats below)
/blog        Post index: tags, dates, read time
/blog/[slug] Post page (existing slugs preserved exactly)
/services    5 services + request-a-quote CTAs
/cv          Resume mirror + print stylesheet + PDF download
/uses        Hardware/software/AI-tooling list (dev-culture page)
/contact     Contact form + newsletter signup
/admin       Payload CMS admin (owner only)
404          Terminal error page: `zsh: command not found`
+ /feed.xml (RSS), /sitemap.xml, robots.txt, PWA manifest
```

### Home — narrative scroll beats (in order)

1. **Hero terminal** — typewriter `$ whoami` → name, "full-stack AI forward
   deployed engineer" positioning, CTAs *Read the blog* / *Work with me*, ⌘K hint.
2. **`$ cat ./about.md`** — bio prose (Inter) with circular headshot (the single
   photo on the site), AI-forward positioning, personal-interests one-liner for
   warmth (music, meditation, non-fiction — carried from current site).
3. **`$ cat ./ai-toolbox`** — chip grid of the AI stack, the differentiator:
   Claude Code · GitHub Copilot · Windsurf/Cascade · MCP servers (Context7,
   SequentialThinking, Figma, Memory, Markitdown, chrome-devtools) · prompt &
   context engineering · custom skills (superpowers, mattpocock). One-line intro:
   "I don't just use AI tools — I deploy them into teams."
4. **`$ ls ./services`** — 5 service cards linking to `/services#<slug>`.
5. **`$ git log --career`** — experience as a commit log: hash-styled entries for
   Centene, Boudreaux, Limbik, Ameritas, NCR Voyix, Cisco, MercuryGate, earlier;
   each one line + org + dates; links to `/cv`.
6. **`$ ls ./open-source`** — three entries:
   - **this site** — "you're looking at it" + GitHub link (**URL: placeholder
     `TBD-BY-OWNER`, supplied later**);
   - **Boudreaux / Fake Four Records** — MPL 2.0 music marketplace, founding
     engineer (github.com/braveneworg/boudreaux, fakefourrecords.com);
   - **contributions** — react-starter-kit (kriasoft), mean.io (linnovate).
7. **`$ tail -3 ./blog`** — three latest posts.
8. **`$ subscribe --newsletter`** — inline email field styled as a prompt.
9. **Footer** — socials rendered subtly as muted mono links (GitHub, LinkedIn
   `linkedin.com/in/mkelley33`, Bluesky), "open source on GitHub" repo link
   (same placeholder), copyleft line, `/uses` link, RSS. The same three social
   links also appear as ⌘K palette entries — nowhere louder than that.

### Blog post page (Hybrid treatment)

`$ cat ./blog/<slug>.mdx` breadcrumb; mono title/meta; **Inter body at reading
sizes**; mono green section headings; terminal-framed Shiki code blocks with
copy button; prev/next; tags. RSS autodiscovery.

### Services page

Five services, each an anchor section: **ai-enablement/** (AI-assisted
development adoption for teams: Claude Code, Copilot, MCP, prompt/context
engineering, training), **product-dev/** (end-to-end React 19/Next.js/Node/
MongoDB/AWS builds), **accessibility/** (WCAG 2.1 AA audits + remediation),
**performance/** (Lighthouse audits, test-coverage rescue, CI hygiene),
**mentoring/** (pairing, leveling-up engineers). Each: pitch, deliverables
list, credibility line from resume, CTA **Request a quote** →
`/contact?reason=services&service=<slug>` (pre-selects reason + service).

### CV page

Mirrors resume structure: professional summary, technical skills (grouped),
professional experience (full detail), education, open-source & writing.
Print stylesheet renders a clean single-column document; "Download PDF" button.
PDF source: **maintained static asset** exported from the resume (checked into
`/public`), not generated at runtime.

### Uses page

Sections: Hardware, Editor & terminal, AI toolbox (expanded from home chips),
Stack defaults, This site's stack. Static page (content lives in code, not
Payload) — it changes rarely and versioning it in git suits the audience.

## 4. Architecture

| Concern      | Choice                                                                |
| ------------ | --------------------------------------------------------------------- |
| Framework    | Next.js 16 App Router, React 19, TypeScript strict (ES2022+)          |
| Styling      | Tailwind CSS 4 (CSS-first `@theme` tokens)                            |
| CMS          | Payload 3 embedded at `/admin`, MongoDB Atlas (Payload Mongo adapter) |
| Editor       | Lexical rich text with code blocks; Shiki rendering                   |
| Media        | Vercel Blob via `@payloadcms/storage-vercel-blob`; `next/image`       |
| UI library   | shadcn/ui (Radix) themed to Phosphor tokens; `cmdk` for ⌘K            |
| Forms        | React Hook Form + Zod (schemas shared client/server)                  |
| Client data  | TanStack Query — ⌘K search only; everything else RSC                  |
| Animations   | Motion (motion.dev) + CSS-only; `prefers-reduced-motion` respected    |
| Theme        | next-themes: class strategy, system → light fallback, `◐` toggle      |
| Email        | nodemailer → AWS SES SMTP (mkelley33.com verified in SES)             |
| Spam         | Honeypot field + Cloudflare Turnstile on contact & newsletter forms   |
| PWA          | Serwist: installable, offline reading of visited posts, offline page  |
| Auth         | Payload built-in admin auth only; no visitor auth, no Auth.js         |
| Hosting      | Vercel; images via Vercel image optimization (no Cloudflare CDN)      |

Notes on PRD deviations (all user-approved in session):

- **Prisma dropped** — Payload's data layer owns all collections; two ORMs on
  one MongoDB would duplicate schemas. Repository pattern is preserved by
  wrapping Payload's Local API instead.
- **Cloudflare CDN dropped** — Vercel image optimization + Vercel Blob serve a
  single-headshot site better; revisit only if media volume grows.

### Code organization

```
src/
  app/                    routes (route groups: (site), (payload))
  components/ui/          shadcn/ui primitives (themed)
  components/<feature>/   hero-terminal, career-log, service-card, …
  lib/repositories/       posts.ts, services.ts, submissions.ts, subscribers.ts
  lib/actions/            contact.ts, newsletter.ts (Server Actions)
  lib/email/              nodemailer transport + templates
  lib/validation/         Zod schemas (shared client/server)
  collections/            Payload collection configs
```

Server Components fetch via repositories; Server Actions mutate and return
`{ success: boolean, error?: string, data?: T }`. Named exports throughout.

## 5. Data model (Payload collections)

- **posts** — title, slug (unique, migration keeps legacy slugs), publishedAt,
  tags[], excerpt, body (Lexical), readTime (computed on save), status
  (draft/published).
- **services** — name, slug, pitch, deliverables[], credibility line, order.
- **contact-submissions** — name, email, reason (enum: services | general |
  speaking-writing | mentoring | other), requestedServices[] (rel → services),
  message, status (new/replied/archived), createdAt. Read-only in admin except
  status.
- **subscribers** — email (unique), status (pending/active/unsubscribed),
  confirmToken (hashed), confirmedAt, unsubscribedAt, createdAt.
- **media** — Payload uploads → Vercel Blob.
- **users** — admin auth (owner account only; registration disabled).

## 6. Key flows

### Contact

1. Form: name, email, reason (dropdown above), message; honeypot + Turnstile.
2. Reason = **Request services** → shadcn Dialog opens listing the 5 services
   as checkboxes; confirmed selections render as removable chips on the form.
   `?reason=services&service=<slug>` deep link pre-selects both.
3. Submit (Server Action): Zod validate → Turnstile verify → create
   `contact-submissions` doc → SES notification email to owner.
4. Success: terminal-style confirmation (`message queued ✓`). Email-send
   failure is logged but the submission is still stored and the user still
   sees success — no lead lost, no false error shown.

### Newsletter (collect-only scope)

1. Email submit (home beat or /contact) → honeypot + Turnstile → create/update
   `subscribers` doc as pending with signed token.
2. Opt-in confirmation email (nodemailer/SES) → `/newsletter/confirm?token=…`
   → status active → themed welcome state.
3. `/newsletter/unsubscribe?token=…` exists from day one.
4. Composing/sending newsletters is explicitly **out of scope** this build.

## 7. Error handling

- Server Actions: try/catch, typed result objects, user-friendly messages,
  server-side logging.
- `error.tsx` and `not-found.tsx` in terminal voice (`zsh: command not found`,
  exit-code gag) with recovery links.
- Zod validation errors mapped to RHF field errors; inline, accessible
  (aria-describedby, aria-invalid).
- SES/transport failures: logged, never block a stored submission/subscriber.

## 8. Quality bar

- **Testing**: Vitest + React Testing Library — repositories, Server Actions,
  validation schemas, feature components; 90%+ coverage target (all metrics).
  Playwright E2E: contact happy path + services modal, newsletter opt-in
  confirm, theme toggle persistence, ⌘K navigation, blog post rendering with
  code blocks. CI via GitHub Actions.
- **Accessibility**: WCAG 2.1 AA both themes — AA contrast for the phosphor
  palette at used sizes, visible focus states, landmarks/semantics, full
  keyboard support (incl. dialog + palette), reduced-motion parity.
- **Performance**: Server Components by default, `next/font` self-hosting,
  lazy-loaded below-the-fold beats, Lighthouse budget ≥90 all categories.
- **SEO**: Metadata API per page, JSON-LD (Person site-wide with `sameAs`
  covering GitHub/LinkedIn/Bluesky, BlogPosting per post), RSS at `/feed.xml`,
  sitemap, terminal-styled generated OG images (satori via `next/og`).

## 9. Content migration

One-off script: parse the 4 existing MDX posts (from mkelley33-pwa repo) →
Payload `posts` docs with identical slugs (`create-a-nextjs-blog`,
`npm-ing-and-npx-ing-commands`, `how-to-tx-node-repl`,
`using-recaptcha-v2-with-formik`), original dates, converted Lexical bodies,
code blocks intact. Verify each URL renders before launch.

## 10. Out of scope / open items

Out of scope this build: newsletter composing/sending; Prisma; Cloudflare CDN;
comments; analytics beyond Vercel Analytics (flag: enable it, zero-config);
visitor accounts.

Open items owner will supply: GitHub repo URL for the open-source beat +
footer; Bluesky profile URL; headshot image; resume PDF export for `/cv`
download; SES production access (out of sandbox) for mkelley33.com; Turnstile
site keys.
