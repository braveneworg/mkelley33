# Privacy page & cookie consent — design

Date: 2026-08-01
Status: approved — grilled 2026-08-01, shared understanding confirmed
Branch: `feat/privacy-cookie-consent`

## Goal

1. A compact but **Art. 13-complete** `/privacy` notice covering all of the
   site's data processing, with a link to Google's policy.
2. An in-depth cookie consent form, in the site's terminal design, that
   **hard-gates all analytics**: neither Google Analytics nor Vercel
   Analytics loads or transmits anything until the visitor grants consent.

**Driver (user-confirmed):** genuine GDPR scope — the site targets EU
consulting clients via `/services` (Art. 3(2) targeting), so this is legal
necessity, not decoration. Accepted cost: visitors who decline or ignore
the banner are invisible in **both** GA and Vercel Analytics; EU
conversion numbers will read low by design.

## Decisions (user-confirmed)

- **Hard gate, not Advanced Consent Mode.** No script loads and zero bytes
  go to Google pre-consent. On grant, Consent Mode v2 signals are seeded
  (`analytics_storage: granted`, all ad signals `denied`) and the GA tag
  mounts.
- **Vercel Analytics is gated too.** Although cookieless, `<Analytics />`
  renders only after analytics consent. Decliners send nothing anywhere.
- **Banner shows in every environment** — not gated on
  `NEXT_PUBLIC_GA_MEASUREMENT_ID`. The GA script itself keeps its env gate
  on top of consent (no measurement ID → nothing loads even after accept).
- **Banner + preferences dialog.** Compact first-visit banner with
  equal-prominence `accept all` / `decline all` / `customize`; `customize`
  opens an in-depth preferences dialog with per-category toggles and a
  per-item cookie/storage inventory.
- **Persistent reopen affordance.** A sticky control fixed to the
  bottom-left corner: a steady phosphor block (`--color-phosphor`, the
  typewriter-caret green, **no blink**), a button with
  `aria-label="cookie preferences"`, revealing a mono `cookies` label on
  hover/focus. Visible whenever the banner is not, so preferences can be
  changed at any time. **All viewports** — caret-sized visually, padded
  hit area ≥44px; footer gets enough bottom padding that the block never
  overlaps the copyleft line.
- **No server-side consent logging** (Art. 7(1) weighed): the hard gate's
  technical impossibility of pre-consent collection is the defense; a
  consent log would be new stored data and its own retention liability,
  not better evidence.
- **Pre-consent events are dropped, not queued.** `trackEvent` calls made
  while undecided are lost even if the visitor later consents. An
  in-memory queue was considered and rejected (same-page-load recovery
  only, ordering bugs, extra state).
- **Hand-rolled, zero new dependencies.** Consent module + UI on existing
  primitives (`dialog.tsx`, design tokens). No consent library, no CMP.

## Architecture

### `src/lib/consent/` — consent core (client-safe, framework-free)

- `types.ts` / `consent-storage.ts`:
  - `ConsentRecord` — `{ version: number; decidedAt: string (ISO);
    analytics: boolean }`. Essential is never stored; it is always on.
  - `CONSENT_VERSION` — bumping invalidates all stored decisions
    (re-prompt after material policy changes).
  - 12-month expiry: records older than 12 months read as undecided
    (CNIL-aligned).
  - Storage: localStorage (key `mkelley33.consent.v1`). Nothing
    server-side reads consent, and repo conventions earmark web storage
    for non-sensitive client state. All reads validated with Zod
    (`safeParse`) — localStorage is user-editable external input.
    Corrupt / expired / wrong-version / missing → `undecided`; storage
    unavailable (private mode) → behaves as undecided per visit. Never
    throws in render.
- `inventory.ts` — single source of truth for the cookie/storage table
  rendered by both the preferences dialog and the privacy page: name,
  provider, purpose, duration, type (cookie / localStorage / script),
  category. Entries: `_ga` (Google, 2y), `_ga_*` (Google, 2y), Vercel
  Analytics (script, no cookies, aggregate), consent record + theme
  (localStorage, essential), Turnstile (Cloudflare script, essential —
  it runs on both forms under legitimate interest, so it is disclosed
  rather than gated). Typed `readonly` throughout: this is a disclosure,
  and a consumer that can splice an entry out can make the page
  under-report what runs.

### `src/components/consent/consent-provider.tsx`

Client context component (lives with the other consent components, not in
`src/lib/`). SSR-safe: starts `loading` (banner and trigger both
unrendered — no banner flash for decided visitors), hydrates from storage
in an effect (no hydration mismatch) to `undecided` or `decided`. Exposes
`{ status: 'loading' | 'undecided' | 'decided', analyticsGranted,
grantAll, denyAll, save, openPreferences, closePreferences,
preferencesOpen }`. Withdrawal side effects (consent update → denied,
`_ga*` cookie deletion, page reload) run here when a decision turns
analytics off after it had been granted.

### Gating

- `GoogleAnalyticsTag` renders `<GoogleAnalytics>` only when
  `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set **and** `analyticsGranted`.
  Before mount it seeds Consent Mode v2 defaults on the dataLayer.
- **Withdrawal:** consent update → `denied`, best-effort deletion of
  `_ga` / `_ga_*` cookies, then a full page reload. Neither gtag.js nor
  Vercel's runtime can be unloaded once mounted, and a denied signal only
  stops storage — reloading is what actually kills both. A first-time
  decline skips the reload: nothing was ever loaded to stop.
- `trackEvent` (`src/lib/analytics.ts`) no-ops unless env var set **and**
  stored consent grants analytics (reads via the storage helper, staying
  framework-free).
- `<Analytics />` (Vercel) renders only when `analyticsGranted`.

### UI — `src/components/consent/`

- `consent-banner.tsx` — non-modal fixed bottom bar (`border-t
  border-edge bg-surface`, mono, `text-sm`), shown only while
  `undecided`. Short copy + three equal-prominence actions: `accept all`
  / `decline all` / `customize` (identical button treatment — no dark
  patterns). Does not trap focus or block the page (no consent wall).
  `z-40`, below palette/dialog layers. `role="region"`,
  `aria-label="cookie consent"`.
- `consent-preferences-dialog.tsx` — built on `src/components/ui/dialog.tsx`:
  - `essential` — always on; control disabled, state text `always on`.
  - `analytics` — toggle, off by default when undecided; state text
    `on` / `off`.
  - Each toggle's **accessible name is its category heading**, not its
    state text: a control announced as "off checkbox" says nothing about
    what is off. The state text stays visible and stays clickable.
  - Inventory table per category from `inventory.ts`.
  - Actions: `save preferences`, `accept all`, `decline all`.
- `consent-cursor-trigger.tsx` — the sticky bottom-left phosphor block
  (steady, cursor-styled, no blink), reveals `cookies` label on
  hover/focus. Hidden while the banner is visible.
- `src/components/ui/switch.tsx` — new tiny primitive: native checkbox
  styled as an ASCII toggle (`[ ]` / `[■]` in phosphor). Accessible by
  construction (real checkbox, visible focus, label association), with
  an optional `labelledBy` that redirects the accessible name to a
  heading when the visible label is only state. Spec beside it.

### Layout wiring (`src/app/(site)/layout.tsx`)

`ConsentProvider` wraps the tree inside `ThemeProvider`; banner, dialog,
and cursor trigger mount beside `PaletteMount`; `GoogleAnalyticsTag` and
`<Analytics />` move inside the provider.

## Privacy page & footer

- `src/app/(site)/privacy/page.tsx` — server page shell (same skeleton as
  `/uses`), with the interactive pieces as small client children.
  **Compact but Art. 13-complete**, terminal register (short lowercase
  mono sections, ~350–450 words), covering the whole site's processing:
  - `who` — Michaux Kelley as controller; contact via `/contact`.
  - `what & why` + `legal basis`:
    - analytics — GA4 (pages, referrers, rough geography; GA4 drops IPs
      at collection) and Vercel Analytics (cookieless, aggregate); legal
      basis **consent**; both run only after the cookie form grants it.
    - contact form — name, email, message, mailed to the owner; legal
      basis **steps prior to a contract** (Art. 6(1)(b)).
    - newsletter — email + double-opt-in confirm/unsubscribe tokens in
      the database; legal basis **consent**; unsubscribe = withdrawal.
    - bot protection — Cloudflare Turnstile on the contact and
      newsletter forms (IP/browser signals); legal basis **legitimate
      interest**; links Cloudflare's policy.
    - hosting — Vercel serves the site and processes IP addresses in
      server logs as a technical necessity; legal basis **legitimate
      interest** in operating the site.
  - `who receives it` — Google LLC, Vercel Inc., Cloudflare Inc. named;
    email delivery provider kept generic; EU→US transfers under the
    EU-US Data Privacy Framework.
  - `retention` — analytics event data **14 months** (GA4 console
    setting user-confirmed as already set); contact/newsletter data kept
    until purpose served or withdrawal.
  - `your rights` — withdraw consent anytime (corner control), with the
    Art. 7(3) note that withdrawal does not affect the lawfulness of
    processing done under that consent beforehand; access / rectification
    / erasure; restriction (Art. 18); objection (Art. 21); data
    portability (Art. 20); complaint to a supervisory authority.
  - Inventory table rendered from `inventory.ts`.
  - Links: <https://policies.google.com/privacy> and
    <https://policies.google.com/technologies/partner-sites>.
  - `manage cookie preferences` button (client, opens the dialog) + note
    about the corner control.
  - Metadata title `privacy`; added to `sitemap.ts` if routes are
    enumerated there.
- Footer: `privacy` internal `Link` beside `uses` / `rss`
  (`link-draw` styling), plus bottom padding so the sticky trigger never
  overlaps the copyleft line.

## Testing (TDD, Vitest, specs adjacent)

- Storage: round-trip, corrupt JSON → undecided, expired → undecided,
  version bump → undecided, storage unavailable → undecided, no throws.
- Provider: grant/deny/save/reopen transitions; SSR-safe initial state.
- `trackEvent`: no-op without env var; no-op without consent; sends with
  both.
- `GoogleAnalyticsTag` / Vercel `Analytics`: render only with env +
  consent (mock `@next/third-parties` / `@vercel/analytics`).
- Banner: visible only while undecided; three actions wired.
- Dialog: toggle state, save persists, accept/decline-all shortcuts.
- Switch primitive: label association, checked state, keyboard.
- Cursor trigger: hidden while banner visible; opens dialog; hit area
  ≥44px despite caret-sized visual.
- Privacy page: renders inventory + links; footer link present.
- E2E: read `e2e/AGENTS.md` in full first. Add a consent-pre-seed helper
  (init-script localStorage) so existing flows keep passing, plus one
  flow: banner → customize → save → banner gone → cursor trigger
  reopens.

## Constraints

- MPL header (`HEADER.txt`) on every new source file.
- Named exports, arrow components, explicit types, no `any`.
- `pnpm run gate` green before every commit; conventional commits with
  gitmoji; no AI attribution.

## Out of scope

- Ad/marketing cookie categories (none exist on the site).
- Consent logging server-side; geo-targeting the banner.
- Cookieless GA alternatives (§8 of the GA setup doc).
