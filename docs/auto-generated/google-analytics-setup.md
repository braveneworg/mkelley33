# Google Analytics 4 — Setup & Visitor-Insight Guide

Written 2026-08-01. The code side of this integration is implemented on
`feat/analytics` (commits `92967cc` and `7fceaeb`); what remains is
owner-side work in the Google, Vercel, and GA4 consoles. Where this guide
references Google's UI, labels are current as of mid-2026 — Google shuffles
menus occasionally, but the concepts don't move.

## Status at a glance

**Done in code (this repo):**

- GA4 tag mounted in the site layout, gated on `NEXT_PUBLIC_GA_MEASUREMENT_ID`
  (`src/components/site/google-analytics-tag.tsx`, rendered from
  `src/app/(site)/layout.tsx`).
- Typed custom-event util `trackEvent` (`src/lib/analytics.ts`).
- Conversion events wired: `request_quote_click`, `cv_download`,
  `generate_lead`, `newsletter_signup`.

**Waiting on the owner (§1, §2.1, §5, §8):**

- Create the GA4 property and get the `G-…` Measurement ID.
- Add the env var in Vercel (Production only).
- Configure the GA4 property: key events, custom dimensions, internal-traffic
  filter, data retention, Search Console link.
- Set up Google Search Console and (optionally) Microsoft Clarity.

---

## 0. How the integration is shaped

Three facts about this codebase make the integration clean:

1. **The admin is excluded structurally.** The Payload CMS admin lives in
   `src/app/(payload)/` and the public site in `src/app/(site)/`. Each route
   group has its **own root layout**, and the GA tag is mounted only in the
   site layout — so nothing under `/admin` ever loads analytics. Next.js
   performs a full page load when navigating between different root layouts,
   so the script cannot leak into the admin via client-side navigation
   either. There is nothing to configure, block, or filter.

2. **Everything is env-gated.** Both the tag and every `trackEvent` call are
   no-ops unless `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set. The variable exists
   only in the production Vercel environment, so dev, preview deployments,
   CI, and Playwright E2E runs never send a hit. Merging analytics code
   before the GA property exists is safe — it ships inert.

3. **Vercel Web Analytics is already mounted** (`<Analytics />` in the site
   layout). GA4 sits alongside it; they complement rather than conflict
   (§8.3).

### How GA4 thinks (30-second primer)

GA4 is **event-based**: everything is an event. A page view is an event named
`page_view`; an instrumented click is an event with a chosen name (e.g.
`request_quote_click`). Events carry **parameters** (key/value context).
The most important events get marked as **key events** (GA's term for
conversions). Reports, funnels, and audiences are all built on that stream.

The integration has three layers:

1. **Automatic** — page views, scrolls, outbound clicks, file downloads,
   via "enhanced measurement" (§1 step 7). No code.
2. **Custom events** — the conversions instrumented in this repo (§4).
3. **Configuration** — the GA4 console work (§5).

---

## 1. Create the GA4 property (Google's side, ~10 minutes)

1. Go to <https://analytics.google.com> and sign in with the Google account
   that should own the property.
2. **Admin** (gear icon, bottom-left) → **Create** → **Account**.
   - Account name: `mkelley33` (an account is just a folder for properties).
   - Data-sharing checkboxes: optional; none are required.
3. **Create a property**:
   - Property name: `mkelley33.com`
   - Timezone and currency: yours (affects report day boundaries only).
4. Business details/objectives screens: pick anything ("Generate leads" is
   the closest fit); these only pre-select starter reports.
5. **Choose a platform → Web**:
   - Website URL: `https://mkelley33.com`
   - Stream name: `mkelley33.com web`
6. The resulting **web data stream** has a **Measurement ID** shaped like
   `G-XXXXXXXXXX`. That ID is the only value the code needs.
7. Still on the data-stream screen, click **Enhanced measurement** (gear).
   Leave it **on**; it provides automatically:

   | Toggle            | What it tracks (no code required)                                                             |
   | ----------------- | --------------------------------------------------------------------------------------------- |
   | Page views        | Every page view, **including client-side route changes** (App Router navigations)             |
   | Scrolls           | `scroll` event when a visitor reaches 90% of page depth                                       |
   | Outbound clicks   | `click` event on links leaving the site — GitHub/LinkedIn/Bluesky links                       |
   | Site search       | Reads search terms from URL query params — the palette search doesn't use URLs; see §4.5      |
   | Form interactions | Generic `form_start` / `form_submit` — noisy; the explicit events in §4 are better            |
   | File downloads    | `file_download` on links ending in .pdf, .zip, etc. — may or may not catch the Blob-hosted CV |

   Google will offer "installation instructions" — **skip them**; the tag is
   already installed via code.

> **Cost: $0.** Standard GA4 is free with no meaningful limits for a
> portfolio site.

---

## 2. How the code side works (implemented)

### 2.1 The environment variable — owner action required

The Measurement ID is not a secret — it's visible in page source to anyone
by design. It still belongs in an env var (config, not code):

```text
Vercel dashboard → project → Settings → Environment Variables
  Name:  NEXT_PUBLIC_GA_MEASUREMENT_ID
  Value: G-XXXXXXXXXX
  Environments: ✅ Production   ❌ Preview   ❌ Development
```

**Production only, deliberately** — see §0 point 2. Locally, add the same
line to `.env.local` only to test the live tag from `pnpm dev` (usually
unnecessary — see §6 for verification).

### 2.2 The tag

`src/components/site/google-analytics-tag.tsx` renders `<GoogleAnalytics>`
from `@next/third-parties/google` (the official Next.js wrapper — loads
`gtag.js` after hydration, non-blocking) when the env var is set, `null`
otherwise. `src/app/(site)/layout.tsx` mounts it beside Vercel's
`<Analytics />`.

### 2.3 The event util

`src/lib/analytics.ts` exports `trackEvent`, typed against an
`AnalyticsEventMap` interface — adding an event means adding a key there,
and every call site stays type-checked. The util no-ops without the env var,
mirroring the tag gate.

---

## 3. What works with zero further configuration

Once deployed with the env var set:

- **Visit frequency & volume** — Reports → Life cycle → Acquisition:
  sessions, users, new vs returning, traffic sources (Google search,
  LinkedIn, direct, …).
- **Every page view** — Reports → Engagement → **Pages and screens**. This
  is where "how many people viewed /services, /cv, or a given blog post"
  lives; filter by path. Per-post blog numbers appear automatically because
  each post is its own path. Any future page (e.g. an `/about`) is covered
  with zero work.
- **Engagement quality** — average engagement time per page, scroll-depth
  events.
- **Outbound clicks** — clicks to GitHub/LinkedIn/Bluesky as `click` events
  with the destination URL attached.
- **Realtime** — who's on the site right now, what page, from where.

What page views can't show is intent: _which button_ someone clicked,
_whether a form actually submitted_. That's §4.

---

## 4. The conversion events (implemented)

| Event                 | Fires when                         | Params                              | Where                                           |
| --------------------- | ---------------------------------- | ----------------------------------- | ----------------------------------------------- |
| `request_quote_click` | "Request a quote →" CTA is clicked | `service` (slug of the service)     | `src/components/services/quote-cta.tsx`         |
| `cv_download`         | "Download PDF ↓" is clicked on /cv | `format: 'pdf'`                     | `src/components/cv/cv-download-link.tsx`        |
| `generate_lead`       | Contact form submit **succeeds**   | `reason` (`general`, `services`, …) | `src/components/contact/contact-form.tsx`       |
| `newsletter_signup`   | Newsletter subscribe **succeeds**  | none                                | `src/components/newsletter/newsletter-form.tsx` |

Design notes:

- **`generate_lead` is GA4's recommended event name** for lead-form
  submissions; using it unlocks better built-in reporting. It fires on the
  server action's _success_ branch, not on button click — the number in GA
  is "messages actually sent"; failed Turnstile checks and validation errors
  don't count. Same for `newsletter_signup`.
- **`reason` beats a static param.** The contact form's reason select means
  a services-quote lead is distinguishable from a general message — and the
  services CTA deep-links with `?reason=services`, so the quote funnel (§8.6)
  connects end to end.
- **`cv_download` is deterministic** where enhanced measurement's
  `file_download` (URL-suffix matching against the Blob URL) may not be.
- **CV _views_ need nothing** — viewing `/cv` is a `page_view`. To count it
  as a formal conversion, see "key events from page views" in §5.2.
- **Custom parameters are invisible until registered** as custom dimensions
  (§5.4).

### 4.5 Palette search (not implemented, optional)

The command-palette search never touches the URL, so GA's automatic site
search can't see it. If search-term insight becomes interesting: add a
`site_search: { search_term: string }` entry to `AnalyticsEventMap` and fire
it when a search settles (debounced — not per keystroke), then register
`search_term` as a custom dimension.

---

## 5. Configure the GA4 property (owner, ~15 minutes, high leverage)

Do these once, in the GA4 web UI, after the first deploy with the env var.
Most settings are not retroactive — cheap now, painful to wish for later.

### 5.1 Filter yourself out

The owner is the site's #1 visitor for a while. Two steps:

1. Admin → Data streams → your stream → **Configure tag settings** →
   **Define internal traffic** → add a rule with your home IP. IPs change;
   re-check occasionally (an ad blocker on your own browsing covers the gap
   — most block GA anyway).
2. Admin → **Data settings → Data filters** → the `Internal Traffic` filter
   starts in _Testing_ mode → set it to **Active**.

### 5.2 Mark key events (conversions)

Admin → **Events**. After each custom event has fired at least once it
appears here — toggle **"Mark as key event"** for:

- `generate_lead`
- `request_quote_click`
- `cv_download`
- `newsletter_signup`

Key events get their own reporting and show up in Acquisition ("which
channel produced quote requests").

**Page views as key events** (e.g. "viewing /cv counts as a conversion"):
Admin → Events → **Create event** → new event named `cv_view` with
conditions `event_name equals page_view` AND `page_location contains /cv`,
then mark `cv_view` as a key event. Same recipe for `/services` or any
future page. For plain "how many people saw this page", skip this — the
Pages and screens report already answers it.

### 5.3 Link Google Search Console

Admin → **Product links → Search Console links** → link (set up Search
Console first, §8.1). This pulls _what people searched on Google to find
the site_ into GA's reports.

### 5.4 Register custom dimensions

Admin → **Custom definitions** → Create custom dimension, scope **Event**:

| Dimension name | Event parameter |
| -------------- | --------------- |
| Service        | `service`       |
| Reason         | `reason`        |

Without this, the parameters are collected but unreportable. Budget ~24h
after registering before data shows. (Add `search_term` only if §4.5 is
ever implemented.)

### 5.5 Two settings while you're in Admin

- **Data retention**: Data settings → Data retention → change **2 months →
  14 months** (the free maximum; affects Explorations, not standard
  reports). Not retroactive — do it on day one.
- **Google Signals** (Data settings → Data collection): leave **off**
  unless running Google Ads; it adds cross-device demographics at the cost
  of stricter consent obligations.

---

## 6. Verify it works

1. Deploy with the env var set.
2. Open the site in a browser **with ad blocking disabled** (uBlock/Brave
   shields block GA outright — the #1 "it's not working" cause), ideally not
   from the filtered IP (phone on cellular works).
3. GA4 → Reports → **Realtime**: the visit appears within ~30 seconds.
4. Click around: services → Request a quote → submit a test contact
   message. Realtime → "Event count by event name" should show `page_view`,
   `request_quote_click`, `generate_lead`.
5. Deeper debugging:
   - DevTools → Network → filter `collect` — each hit to
     `google-analytics.com/g/collect` is an event leaving the page.
   - DevTools console: `window.dataLayer` shows every queued event even if
     transmission is blocked.
   - **Tag Assistant** (<https://tagassistant.google.com>) connects to the
     live site and shows exactly what fires; **Admin → DebugView** shows
     those hits server-side while Tag Assistant is connected.
6. Standard reports lag ~24–48h. Realtime and DebugView are immediate —
   an empty "Pages and screens" on day one is normal.

---

## 7. Privacy notes (not legal advice)

- GA4 sets cookies and processes visitor data on Google's servers. Standard
  hygiene for a personal portfolio: a short **privacy page** stating the
  site uses Google Analytics and Vercel Analytics to understand usage, with
  a link to Google's policy. The site doesn't currently have one.
- GA4 does **not** log IP addresses (dropped at collection).
- If EU traffic ever matters commercially, GDPR/ePrivacy expects consent
  before analytics cookies fire (consent banner + Google **Consent Mode
  v2**). For a US-focused personal portfolio, most owners accept the risk
  and keep just the privacy page. To never think about cookie consent at
  all, lean on the cookieless tools in §8 instead of GA.
- The admin stays unanalyzed by design (§0).

---

## 8. The rest of the free stack — what GA can't tell you

GA4 answers _what happened_. These answer _how the site is found_, _why
visitors behaved that way_, and _was it fast_ — and one compensates for GA's
biggest blind spot (ad blockers eat roughly a quarter to a third of GA data
for developer-heavy audiences).

### 8.1 Google Search Console — highest priority

**What:** How the site performs _in Google Search_ — queries, impressions,
clicks, indexing status. Free, no script, zero performance cost.

**Why now:** Google's index still holds stale entries from the pre-cutover
site. Search Console shows exactly what's indexed and lets you request
recrawls.

**Setup (~10 min):**

1. <https://search.google.com/search-console> → Add property → **Domain**
   type → `mkelley33.com` → verify via the DNS TXT record it provides.
2. Submit the sitemap: Sitemaps → `https://mkelley33.com/sitemap.xml`
   (generated by `src/app/sitemap.ts`).
3. **URL Inspection** on key pages (`/`, `/services`, `/cv`, `/blog`) →
   "Request indexing" to hurry the stale-index refresh.
4. Link it to GA4 (§5.3).

### 8.2 Microsoft Clarity — behavior, free, genuinely unlimited

Session recordings (anonymized replays), heatmaps, and frustration signals
(rage clicks, dead clicks). This is the "why" layer GA lacks: GA says 40% of
visitors leave `/services` without clicking the quote CTA; Clarity shows
what they did instead. Free with no traffic caps.

Setup: create a project at <https://clarity.microsoft.com>, then add its
script — same placement rule as GA: **site layout only** (a `next/script`
component in `(site)/layout.tsx`), so the admin stays excluded. Clarity can
link to GA4 (Clarity Settings → Setup → Google Analytics) so recordings
attach to GA sessions. Worth checking monthly and after any design change
to `/services` or `/contact`.

### 8.3 Vercel Web Analytics + Speed Insights

- **Web Analytics** (already mounted): cookieless, served first-party, so
  **ad blockers rarely strip it** — the reality check when GA undercounts.
  Free Hobby tier: 50k events/month. Caveat: **custom events** (`track()`)
  require a Pro plan — keep conversions in GA, page-view truth in Vercel.
  Verify it's enabled: Vercel dashboard → project → Analytics tab.
- **Speed Insights** (`@vercel/speed-insights`, not yet installed): real-user
  Core Web Vitals per page — mount `<SpeedInsights />` beside
  `<Analytics />` if wanted; free tier included.

### 8.4 Worth knowing about, not worth adding today

| Tool                        | What it adds                                                   | Why wait                                                                                             |
| --------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **PostHog** (free 1M ev/mo) | Product analytics: funnels, session replay, feature flags, A/B | Overlaps GA+Clarity almost entirely; shines for apps with logged-in users, not portfolios            |
| **Umami / Plausible**       | Cookieless, open-source, GDPR-simple page analytics            | Umami needs self-hosting; Plausible cloud is paid. Vercel Analytics already fills this slot          |
| **Google Tag Manager**      | Manage tags/events without code deploys                        | Indirection this repo doesn't need — events are typed, tested code, which fits how the project works |
| **Hotjar**                  | Heatmaps/recordings                                            | Clarity does the same with no traffic limits                                                         |

### 8.5 The recommended stack, summarized

| Question                                             | Tool                      |
| ---------------------------------------------------- | ------------------------- |
| Who visits, from where, how often, what converts     | **GA4**                   |
| How is the site found on Google / is the index fresh | **Search Console**        |
| Why aren't they clicking / where do they struggle    | **Clarity**               |
| True traffic count (ad-blocker-proof)                | **Vercel Web Analytics**  |
| Is the site fast for real users                      | **Vercel Speed Insights** |

All five: $0.

### 8.6 One habit that multiplies all of it: UTM tags

When sharing links — LinkedIn posts, the CV footer, an email signature —
append UTM parameters so GA attributes the visit to the exact placement:

```text
https://mkelley33.com/services?utm_source=linkedin&utm_medium=social&utm_campaign=services_launch
https://mkelley33.com/cv?utm_source=resume_pdf&utm_medium=referral
```

`utm_source` (where), `utm_medium` (type), `utm_campaign` (which push). GA
picks these up automatically — no code. This is how "LinkedIn posts drive
quote requests but Bluesky posts don't" becomes measurable.

Once data accumulates: **Explorations → Funnel exploration** with steps
`page_view /services` → `request_quote_click` → `page_view /contact` →
`generate_lead` shows exactly where prospects fall out of the quote
pipeline.

---

## 9. Remaining checklist (all owner-side)

Google / Vercel consoles:

- [ ] Create GA4 account + property + web stream; copy the `G-…` ID (§1)
- [ ] Add `NEXT_PUBLIC_GA_MEASUREMENT_ID` in Vercel — Production only (§2.1)
- [ ] Set up Search Console: verify domain, submit sitemap, request
      re-indexing of key pages (§8.1)

GA4 console, after the first deploy with the env var:

- [ ] Verify via Realtime with ad blocker off (§6)
- [ ] Internal-traffic filter → Active (§5.1)
- [ ] Mark the four key events (§5.2)
- [ ] Register custom dimensions: `service`, `reason` (§5.4)
- [ ] Data retention → 14 months (§5.5)
- [ ] Link Search Console (§5.3)
- [ ] Confirm Vercel Web Analytics is enabled in the dashboard (§8.3)

Optional, anytime:

- [ ] Microsoft Clarity script in the site layout (§8.2)
- [ ] `@vercel/speed-insights` + `<SpeedInsights />` (§8.3)
- [ ] A `/privacy` page mentioning GA + Vercel Analytics (§7)
- [ ] Palette `site_search` event (§4.5)
