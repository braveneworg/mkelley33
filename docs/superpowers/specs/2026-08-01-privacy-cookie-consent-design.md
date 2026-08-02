# Privacy page & cookie consent — design

Date: 2026-08-01
Status: approved pending user review
Branch: `feat/privacy-cookie-consent`

## Goal

1. A short `/privacy` page disclosing that the site uses Google Analytics 4
   and Vercel Analytics to understand usage, with a link to Google's policy.
2. An in-depth cookie consent form, in the site's terminal design, that
   **hard-gates all analytics**: neither Google Analytics nor Vercel
   Analytics loads or transmits anything until the visitor grants consent
   (EU ePrivacy/GDPR posture).

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
  changed at any time.
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
  (localStorage, essential).

### `src/components/consent/consent-provider.tsx`

Client context component (lives with the other consent components, not in
`src/lib/`). SSR-safe: starts `undecided`, hydrates from storage in an
effect (no hydration mismatch). Exposes `{ status: 'undecided' |
'decided', analyticsGranted, grantAll, denyAll, save, openPreferences,
closePreferences, preferencesOpen }`. Withdrawal side effects (consent
update → denied, `_ga*` cookie deletion) run here when a save turns
analytics off.

### Gating

- `GoogleAnalyticsTag` renders `<GoogleAnalytics>` only when
  `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set **and** `analyticsGranted`.
  Before mount it seeds Consent Mode v2 defaults on the dataLayer.
- **Withdrawal:** consent update → `denied`, best-effort deletion of
  `_ga` / `_ga_*` cookies; the already-loaded script stays inert until
  the next page load.
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
  - `essential` — always on; control disabled, labeled `always on`.
  - `analytics` — toggle, off by default when undecided.
  - Inventory table per category from `inventory.ts`.
  - Actions: `save preferences`, `accept all`, `decline all`.
- `consent-cursor-trigger.tsx` — the sticky bottom-left phosphor block
  (steady, cursor-styled, no blink), reveals `cookies` label on
  hover/focus. Hidden while the banner is visible.
- `src/components/ui/switch.tsx` — new tiny primitive: native checkbox
  styled as an ASCII toggle (`[ ]` / `[■]` in phosphor). Accessible by
  construction (real checkbox, visible focus, label association). Spec
  beside it.

### Layout wiring (`src/app/(site)/layout.tsx`)

`ConsentProvider` wraps the tree inside `ThemeProvider`; banner, dialog,
and cursor trigger mount beside `PaletteMount`; `GoogleAnalyticsTag` and
`<Analytics />` move inside the provider.

## Privacy page & footer

- `src/app/(site)/privacy/page.tsx` — server page shell (same skeleton as
  `/uses`), with the interactive pieces as small client children. Content:
  - What is measured and why: GA4 (pages, referrers, rough geography;
    GA4 drops IPs at collection) and Vercel Analytics (cookieless,
    aggregate). Both run **only after consent**.
  - Inventory table rendered from `inventory.ts`.
  - Links: <https://policies.google.com/privacy> and
    <https://policies.google.com/technologies/partner-sites>.
  - `manage cookie preferences` button (client, opens the dialog) + note
    about the corner control. Questions → `/contact`.
  - Metadata title `privacy`; added to `sitemap.ts` if routes are
    enumerated there.
- Footer: `privacy` internal `Link` beside `uses` / `rss`
  (`link-draw` styling).

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
- Cursor trigger: hidden while banner visible; opens dialog.
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
