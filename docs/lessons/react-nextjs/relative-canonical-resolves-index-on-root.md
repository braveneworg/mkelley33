# `canonical: './'` resolves to `/index` on the root route

**Symptom:** after PR #28 shipped `alternates: { canonical: './' }` in the
site layout, every page rendered a correct self-referencing
`<link rel="canonical">` — except the homepage, which emitted
`https://mkelley33.com/index`. Next also _serves_ `/index` (HTTP 200, no
redirect), so the homepage existed at two URLs and declared the wrong one
canonical.

**Root cause:** Next's metadata resolver composes a relative canonical with
the request pathname (`resolveRelativeUrl` →
`path.posix.resolve(pathname, './')`), but the root route's _internal_
pathname is `/index`, not `/`. `path.posix.resolve('/index', './')` is
`/index`. Every non-root route passes its public pathname, which is why only
the homepage broke. Verified in
`node_modules/next/dist/lib/metadata/resolvers/resolve-url.js` (Next 16.2).

**Rule:**

- Keep `canonical: './'` in the layout for all non-root routes, and pin the
  homepage's canonical in `src/app/(site)/page.tsx` with
  `alternates: { canonical: '/' }`.
- A page-level `alternates` replaces the layout's object **wholesale**
  (metadata merging is shallow per top-level key), so an override must
  re-declare everything the layout provided — the shared RSS entry lives in
  `src/lib/feed-alternates.ts` so the two declarations cannot drift.
- Reading the framework's resolver source is not verification of the inputs
  it will be handed. The `resolveRelativeUrl` check proved `'./'` follows
  the pathname but assumed the root pathname would be `/`. After a deploy
  touching metadata, curl every affected route class (root, static page,
  dynamic page) and grep the rendered HTML — the root route is its own
  class.

**History:** 2026-08-01 — bug shipped in PR #28, caught by checking the
rendered canonicals on production immediately after deploy, fixed with the
homepage override in the follow-up PR.
