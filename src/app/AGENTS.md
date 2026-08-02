# src/app/ — UI: components, forms, styling

Read with [`src/AGENTS.md`](../AGENTS.md). Components live in
`src/components/` (not `src/app/components/`); this guide covers both the
route tree here and the components they render.

Everything above "Not here yet" describes the codebase as it stands and is
binding. Everything below it applies only once the thing it names exists.

## Components

- Function components only — never class components. Keep them small; split
  large files. Destructure props with explicit types.
- State: React built-ins (`useState` / `useReducer` / `useContext`). Reach for
  an external store only when architectural complexity justifies it — there is
  none today and none is installed.
- React 19 concurrency where it improves UX: `useTransition` for non-urgent
  updates (in use in two components), `useDeferredValue` for expensive derived
  renders, `useId` for hydration-safe IDs.
- Wrap risky subtrees in error boundaries; handle async failures gracefully.
- Never ship `console.log` — `no-console` allows only `warn`, `error`, and
  `info`, which is what the codebase uses (17 `error`, 2 `warn`, 1 `info`).
  There is no logger module; do not reference one.
- Never use `alert` / `prompt` — use the dialog primitive in
  `src/components/ui/dialog.tsx`.
- Prefer `globalThis` over bare `window` for client globals so a module stays
  importable during SSR. Eight components currently touch `window.` directly
  inside effects and event handlers, which is safe because those never run on
  the server — the rule matters for module-scope access.

## Forms

- React Hook Form + Zod via `zodResolver` (both installed; used by the contact
  and newsletter forms). There is no shared field library — check
  `src/components/contact/` and `src/components/newsletter/` for the
  established pattern before building new inputs.

## Styling & accessibility

- Mobile-first; Tailwind v4 utilities only — no `@apply` (zero occurrences,
  keep it that way). Design tokens are CSS-first in
  `src/app/(site)/globals.css` under `@theme`.
- Inline styles are reserved for the two places Tailwind cannot reach: the
  `ImageResponse`/Satori OG images (`src/app/opengraph-image.tsx`,
  `src/app/(site)/blog/[slug]/opengraph-image.tsx`) and motion-value styles in
  `src/components/motion/magnetic.tsx`. Nowhere else.
- Class names are composed with template literals — see
  `src/components/ui/button-link.tsx` and `error-text.tsx`. There is no `cn()`
  helper, and `clsx`/`tailwind-merge` are not installed.
- UI primitives live in `src/components/ui/` (`button-link`, `dialog`,
  `error-text`), each with a spec beside it. shadcn/ui itself is **not**
  installed — there is no `components.json`, so there is no `shadcn add` to
  run. The pattern is shadcn's, applied by hand: `dialog.tsx` wraps
  `@radix-ui/react-dialog` (the only Radix package here) with module-level
  class constants, while `button-link` and `error-text` are plain components.
  Reuse an existing primitive before adding one; pull in the matching Radix
  package when a new primitive needs real interaction behavior.
- Fonts are Inter (`--font-sans`) and JetBrains Mono (`--font-mono`), loaded
  via `next/font/google` in the site layout.
- Icons: no icon library is installed, and the terminal aesthetic uses text
  glyphs — `aria-hidden`, with the meaning carried by adjacent text or the
  control's `aria-label`. Exactly one component ships an inline `<svg>`:
  `src/components/consent/consent-cookie-trigger.tsx`, whose cookie is a
  deliberate exception (owner decision, 2026-08-02) because the caret glyph is
  reserved for the terminal branding and an emoji cookie cannot be tinted
  phosphor. It follows the same rules as the glyphs — `aria-hidden="true"`,
  `fill-current` under a `text-phosphor` parent, meaning on the button's
  `aria-label`. Everything else stays text; a second inline SVG needs its own
  owner decision, not this precedent.
- Semantic HTML, ARIA, and keyboard navigation are required.

## Performance

- Code-split and lazy-load non-critical UI (`React.lazy` + `Suspense`,
  `next/dynamic`) with skeleton/Suspense fallbacks.
- Use `next/image` for images.
- Memoize (`memo` / `useCallback` / `useMemo`) only where profiling shows it
  helps — never by default.

## Not here yet

Aspirational — nothing in the tree can currently violate these.

- **Shared form fields.** `src/app/components/forms/fields/` does not exist.
  If a third form arrives, extract the shared field components there (or,
  matching current layout, `src/components/forms/fields/`) rather than
  copying markup a third time.
- **An external store.** Neither Zustand nor Redux Toolkit is installed.
- **TanStack Query as the client cache.** Used in one component only; see the
  "Not here yet" entry in [`src/AGENTS.md`](../AGENTS.md) before leaning on it
  as the answer to client caching.
- **`docs/lessons/react-nextjs/next-dynamic-loading-only-ssr.md`.** The
  category directory exists now (created 2026-08-01), but this particular
  lesson is still unwritten: `next/dynamic` with `ssr: false` skips server
  rendering in the App Router. Treat the caveat as true; write the lesson
  when it next bites.
