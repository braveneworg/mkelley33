# Phase 5: Polish — Motion, ⌘K, PWA, OG, A11y, E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the launch-quality layer: motion language (typewriter hero, scroll reveals, reduced-motion parity), ⌘K command palette with post search, installable PWA with offline reading, generated OG images, the accumulated a11y/consistency backlog, the Phase-4 functional fixes, and the spec's Playwright E2E suite wired into CI.

**Architecture:** Motion (motion.dev) for scroll reveals/palette spring/magnetic CTA with CSS-only typewriter/blink/scanlines, everything gated on `prefers-reduced-motion`; cmdk inside the existing token-themed Dialog with a palette-scoped TanStack Query client hitting a new `/api/search` route; Serwist service worker + `manifest.ts` + sharp-generated icons; `next/og` ImageResponse with a committed JetBrains Mono TTF; E2E via a node runner that boots mongod, migrates the real posts, seeds services, starts `next start`, and scrapes the JSON email transport's log for the newsletter confirm link.

**Tech Stack:** motion, cmdk, @tanstack/react-query, @serwist/next + serwist, next/og, @vercel/analytics, @playwright/test, sharp (existing), Vitest/RTL.

## Global Constraints

- TypeScript strict, no `any`; named exports except Next.js page/config/route defaults.
- Design tokens only in component classNames. Raw hex is permitted ONLY where CSS tokens cannot reach, all plan-sanctioned: the print block in globals.css (existing), OG `ImageResponse` styles, `manifest.ts` colors, the icons script's SVG, and the theme-color sync values — each must use the exact palette values from globals.css (`#0b0f14`, `#f4f7f5`, `#46e08a`, `#d7e2e9`, `#7d93a5`, `#10161d`, `#17211c`).
- Every animation MUST have a reduced-motion story: CSS animations disabled under `@media (prefers-reduced-motion: reduce)`; Motion components render static (no transform/opacity animation) when `useReducedMotion()` is true.
- Terminal voice: lowercase page h1s (`# services`, not `# Services`); decorative shell glyphs (`$`, `#`, `▸`) are `aria-hidden` with meaningful text exposed — this phase makes that the site-wide convention.
- Coverage thresholds stay 90% aggregate over src/components/** and src/lib/**; new client components need tests. `e2e/**` must be excluded from Vitest.
- `pnpm build:ci` flake protocol: on failure run ONCE more; pass on either = green; two failures = BLOCKED.
- NEVER touch `.claude/`, settings, or permission files; permission denial → BLOCKED.
- Every commit ends with the two trailers:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01VWHYP1WscXnehjiTacQrCA`

## File Structure

```
src/components/motion/reveal.tsx, magnetic.tsx        (Task 1)
src/app/(site)/globals.css                            typewriter/blink/scanlines utilities (Task 1), print shiki (Task 6)
src/components/palette/command-palette.tsx, palette-mount.tsx; src/app/api/search/route.ts  (Task 2)
src/sw.ts, src/app/manifest.ts, src/app/(site)/~offline/page.tsx, scripts/generate-icons.mjs, public/icons/*  (Task 3)
src/app/opengraph-image.tsx, src/app/(site)/blog/[slug]/opengraph-image.tsx, src/assets/fonts/JetBrainsMono-Bold.ttf  (Task 4)
src/components/site/theme-color-sync.tsx; layout skip link; terminal-section h2  (Task 5)
src/components/ui/error-text.tsx + site-wide prefix/copy sweep  (Task 6)
src/lib/... functional fixes + @vercel/analytics  (Task 7)
playwright.config.ts, scripts/e2e.mjs, e2e/*.spec.ts, .github/workflows/ci.yml e2e job  (Task 8)
```

---

### Task 1: Motion foundation — typewriter hero, reveals, magnetic CTA

**Files:**
- Create: `src/components/motion/reveal.tsx`, `src/components/motion/magnetic.tsx`
- Modify: `src/app/(site)/globals.css` (append utilities/keyframes), `src/components/home/hero.tsx`, `src/components/home/terminal-section.tsx`
- Test: `src/components/motion/reveal.test.tsx`, `src/components/motion/magnetic.test.tsx` (existing hero/terminal-section tests must stay green)

**Interfaces:**
- Produces: `Reveal({ children, delay? })` client wrapper (whileInView fade/rise spring, static under reduced motion); `Magnetic({ children })` pointer-follow spring wrapper. TerminalSection body wrapped in `Reveal` (its `{children, command}` signature unchanged).

- [ ] **Step 1: Install motion**

```bash
pnpm add motion
```

- [ ] **Step 2: Write the failing tests**

`src/components/motion/reveal.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { Reveal } from '@/components/motion/reveal';

beforeAll(() => {
  class MockIntersectionObserver {
    disconnect() {}
    observe() {}
    unobserve() {}
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    value: MockIntersectionObserver,
  });
});

describe('Reveal', () => {
  it('renders its children', () => {
    render(
      <Reveal>
        <p>beat content</p>
      </Reveal>,
    );
    expect(screen.getByText('beat content')).toBeInTheDocument();
  });
});
```

`src/components/motion/magnetic.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { Magnetic } from '@/components/motion/magnetic';

describe('Magnetic', () => {
  it('renders its children', () => {
    render(
      <Magnetic>
        <a href="/blog">Read the blog →</a>
      </Magnetic>,
    );
    expect(
      screen.getByRole('link', { name: 'Read the blog →' }),
    ).toBeInTheDocument();
  });
});
```

Run: `pnpm exec vitest run src/components/motion` — Expected: FAIL (modules missing).

- [ ] **Step 3: Implement `src/components/motion/reveal.tsx`**

```tsx
'use client';

import { motion, useReducedMotion } from 'motion/react';

import type { ReactNode } from 'react';

export function Reveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <div>{children}</div>;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      transition={{ bounce: 0.2, delay, duration: 0.6, type: 'spring' }}
      viewport={{ amount: 0.2, once: true }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 4: Implement `src/components/motion/magnetic.tsx`**

```tsx
'use client';

import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

import type { PointerEvent, ReactNode } from 'react';

export function Magnetic({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { damping: 15, stiffness: 300 });
  const springY = useSpring(y, { damping: 15, stiffness: 300 });

  if (reduced) {
    return <span className="inline-block">{children}</span>;
  }

  function onPointerMove(event: PointerEvent<HTMLSpanElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) * 0.2);
    y.set((event.clientY - rect.top - rect.height / 2) * 0.2);
  }

  function onPointerLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.span
      className="inline-block"
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
      style={{ x: springX, y: springY }}
    >
      {children}
    </motion.span>
  );
}
```

- [ ] **Step 5: Append motion CSS to `src/app/(site)/globals.css`** (after the `@utility bg-blueprint` block)

```css
@utility typewriter {
  display: inline-block;
  overflow: hidden;
  white-space: nowrap;
  border-right: 0.5em solid var(--accent);
  width: 8ch;
  animation:
    typing 1.2s steps(8, end),
    caret-blink 1s step-end infinite;
}

@utility scanlines {
  position: relative;
}

.scanlines::after {
  content: '';
  pointer-events: none;
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 3px,
    var(--grid-line) 3px,
    var(--grid-line) 4px
  );
  opacity: 0.5;
}

@utility link-draw {
  background-image: linear-gradient(var(--accent), var(--accent));
  background-position: 0 100%;
  background-repeat: no-repeat;
  background-size: 0% 1px;
  transition: background-size 0.25s ease;
}

.link-draw:hover,
.link-draw:focus-visible {
  background-size: 100% 1px;
}

@keyframes typing {
  from {
    width: 0;
  }
  to {
    width: 8ch;
  }
}

@keyframes caret-blink {
  50% {
    border-color: transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .typewriter {
    animation: none;
    border-right-color: transparent;
  }
  .scanlines::after {
    content: none;
  }
  .link-draw {
    transition: none;
  }
}
```

- [ ] **Step 6: Wire hero and TerminalSection**

`src/components/home/hero.tsx`: the prompt line becomes decorative + animated, and the primary CTA becomes magnetic:

```tsx
import Link from 'next/link';

import { Magnetic } from '@/components/motion/magnetic';
import { ButtonLink } from '@/components/ui/button-link';
import { siteConfig } from '@/lib/site-config';

export function Hero() {
  return (
    <section className="scanlines bg-blueprint">
      <div className="mx-auto w-full max-w-5xl px-5 py-20 sm:py-28">
        <p aria-hidden="true" className="typewriter font-mono text-sm text-phosphor">
          $ whoami
        </p>
        ...rest unchanged, except the first CTA:
        <Magnetic>
          <ButtonLink href="/blog">Read the blog →</ButtonLink>
        </Magnetic>
      </div>
    </section>
  );
}
```

(Keep every other line of hero.tsx exactly as it is — only the section className, the prompt `<p>`, and the Magnetic wrapper change.)

`src/components/home/terminal-section.tsx`: wrap the children block (NOT the command line) in `<Reveal>…</Reveal>`, importing `Reveal`. Signature and command-line markup unchanged. Existing terminal-section/beat tests must still pass (Reveal renders a plain div around children; the IntersectionObserver mock in vitest.setup is NOT needed for these because `whileInView` only arms on mount — if any existing jsdom test errors on missing IntersectionObserver, add the same mock used in reveal.test.tsx to `vitest.setup.ts` instead of per-file, and note it in your report).

- [ ] **Step 7: Run tests, gate, commit**

```bash
pnpm exec vitest run src/components/motion src/components/home
pnpm lint && pnpm typecheck && pnpm test
git add src/components/motion "src/app/(site)/globals.css" src/components/home/hero.tsx src/components/home/terminal-section.tsx package.json pnpm-lock.yaml vitest.setup.ts
git commit -m "feat: motion foundation — typewriter hero, scroll reveals, magnetic cta"
```

---

### Task 2: ⌘K command palette + search API

**Files:**
- Create: `src/components/palette/command-palette.tsx`, `src/components/palette/palette-mount.tsx`, `src/app/api/search/route.ts`
- Modify: `src/app/(site)/layout.tsx` (mount), `src/components/site/site-nav.tsx` (kbd hint → button)
- Test: `src/components/palette/command-palette.test.tsx`

**Interfaces:**
- Consumes: `listPublishedPosts` (repository), `siteConfig.socials`, Dialog primitives, next-themes context (palette mounts INSIDE ThemeProvider).
- Produces: `CommandPalette()` (opens on ⌘K/Ctrl-K or `window` event `'palette:open'`); `PaletteMount()` (ssr-false dynamic wrapper); `GET /api/search?q=` → `{ results: { slug, title }[] }`.

- [ ] **Step 1: Install deps**

```bash
pnpm add cmdk @tanstack/react-query
```

- [ ] **Step 2: Implement `src/app/api/search/route.ts`**

```ts
import { NextResponse } from 'next/server';

import { listPublishedPosts } from '@/lib/repositories/posts';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }
  const posts = await listPublishedPosts();
  const results = posts
    .filter(
      (post) =>
        post.title.toLowerCase().includes(q) ||
        (post.tags ?? []).some((tag) => tag.toLowerCase().includes(q)),
    )
    .slice(0, 8)
    .map((post) => ({ slug: post.slug, title: post.title }));
  return NextResponse.json(
    { results },
    { headers: { 'cache-control': 's-maxage=300, stale-while-revalidate=600' } },
  );
}
```

- [ ] **Step 3: Write the failing palette test**

`src/components/palette/command-palette.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { CommandPalette } from '@/components/palette/command-palette';

const push = vi.fn();
const setTheme = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', setTheme }),
}));

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [{ slug: 'create-a-nextjs-blog', title: 'Create a Next.js blog' }],
        }),
        { status: 200 },
      ),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CommandPalette', () => {
  it('opens on meta+k and lists page entries', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.keyboard('{Meta>}k{/Meta}');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('./services')).toBeInTheDocument();
    expect(screen.getByText('./uses')).toBeInTheDocument();
  });

  it('opens on the palette:open window event', async () => {
    render(<CommandPalette />);
    window.dispatchEvent(new Event('palette:open'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('navigates when a page entry is selected', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    await user.keyboard('{Meta>}k{/Meta}');
    await user.click(await screen.findByText('./services'));
    expect(push).toHaveBeenCalledWith('/services');
  });

  it('searches posts once two characters are typed', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    await user.keyboard('{Meta>}k{/Meta}');
    await user.type(
      screen.getByPlaceholderText('type a command or search…'),
      'next',
    );
    expect(await screen.findByText('Create a Next.js blog')).toBeInTheDocument();
    await user.click(screen.getByText('Create a Next.js blog'));
    expect(push).toHaveBeenCalledWith('/blog/create-a-nextjs-blog');
  });

  it('toggles the theme from the theme entry', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    await user.keyboard('{Meta>}k{/Meta}');
    await user.click(screen.getByText(/toggle theme/));
    expect(setTheme).toHaveBeenCalledWith('light');
  });
});
```

Run: `pnpm exec vitest run src/components/palette` — Expected: FAIL.

- [ ] **Step 4: Implement `src/components/palette/command-palette.tsx`**

```tsx
'use client';

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { Command } from 'cmdk';
import { motion, useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { siteConfig } from '@/lib/site-config';

interface SearchResult {
  slug: string;
  title: string;
}

const PAGES = [
  { href: '/', label: './home' },
  { href: '/blog', label: './blog' },
  { href: '/services', label: './services' },
  { href: '/cv', label: './cv' },
  { href: '/uses', label: './uses' },
  { href: '/contact', label: './contact' },
] as const;

const ITEM_CLASSES =
  'flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-fg data-[selected=true]:bg-canvas data-[selected=true]:text-phosphor';

function PostResults({
  onNavigate,
  query,
}: {
  onNavigate: (href: string) => void;
  query: string;
}) {
  const { data } = useQuery({
    enabled: query.trim().length >= 2,
    queryFn: async (): Promise<SearchResult[]> => {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query.trim())}`,
      );
      if (!response.ok) {
        return [];
      }
      const json = (await response.json()) as { results: SearchResult[] };
      return json.results;
    },
    queryKey: ['search', query.trim()],
  });
  if (!data || data.length === 0) {
    return null;
  }
  return (
    <Command.Group heading="posts">
      {data.map((post) => (
        <Command.Item
          className={ITEM_CLASSES}
          key={post.slug}
          onSelect={() => onNavigate(`/blog/${post.slug}`)}
          value={post.title}
        >
          {post.title}
        </Command.Item>
      ))}
    </Command.Group>
  );
}

function PaletteDialog() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('palette:open', onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('palette:open', onOpenEvent);
    };
  }, []);

  function navigate(href: string) {
    setOpen(false);
    setQuery('');
    router.push(href);
  }

  function openExternal(url: string) {
    setOpen(false);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const socials = [
    { label: 'github', url: siteConfig.socials.github },
    { label: 'linkedin', url: siteConfig.socials.linkedin },
    ...(siteConfig.socials.bluesky
      ? [{ label: 'bluesky', url: siteConfig.socials.bluesky }]
      : []),
  ];

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent
        aria-describedby={undefined}
        className="top-[20%] max-w-lg translate-y-0 p-2"
      >
        <DialogTitle className="sr-only">command palette</DialogTitle>
        <motion.div
          animate={reduced ? undefined : { opacity: 1, scale: 1 }}
          initial={reduced ? false : { opacity: 0, scale: 0.96 }}
          transition={{ bounce: 0.25, duration: 0.25, type: 'spring' }}
        >
          <Command
            className="font-mono text-sm [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-fg-muted"
            label="command palette"
          >
            <Command.Input
              autoFocus
              className="w-full rounded border border-edge bg-canvas px-3 py-2 text-fg placeholder:text-fg-muted focus:border-phosphor focus:outline-none"
              onValueChange={setQuery}
              placeholder="type a command or search…"
              value={query}
            />
            <Command.List className="mt-2 max-h-72 overflow-y-auto">
              <Command.Empty className="px-3 py-6 text-fg-muted">
                <span aria-hidden="true"># </span>nothing found
              </Command.Empty>
              <Command.Group heading="pages">
                {PAGES.map((page) => (
                  <Command.Item
                    className={ITEM_CLASSES}
                    key={page.href}
                    onSelect={() => navigate(page.href)}
                    value={page.label}
                  >
                    {page.label}
                  </Command.Item>
                ))}
              </Command.Group>
              <PostResults onNavigate={navigate} query={query} />
              <Command.Group heading="links">
                {socials.map((social) => (
                  <Command.Item
                    className={ITEM_CLASSES}
                    key={social.label}
                    onSelect={() => openExternal(social.url)}
                    value={social.label}
                  >
                    {social.label} ↗
                  </Command.Item>
                ))}
                <Command.Item
                  className={ITEM_CLASSES}
                  onSelect={() => openExternal('/feed.xml')}
                  value="rss"
                >
                  rss ↗
                </Command.Item>
              </Command.Group>
              <Command.Group heading="theme">
                <Command.Item
                  className={ITEM_CLASSES}
                  onSelect={() => {
                    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
                    setOpen(false);
                  }}
                  value="toggle theme"
                >
                  toggle theme ◐
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

export function CommandPalette() {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <PaletteDialog />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 5: Implement `src/components/palette/palette-mount.tsx`** (code-splits the palette out of the initial bundle)

```tsx
'use client';

import dynamic from 'next/dynamic';

const CommandPalette = dynamic(
  () =>
    import('@/components/palette/command-palette').then(
      (module_) => module_.CommandPalette,
    ),
  { ssr: false },
);

export function PaletteMount() {
  return <CommandPalette />;
}
```

- [ ] **Step 6: Mount + nav hint**

`src/app/(site)/layout.tsx`: render `<PaletteMount />` INSIDE `<ThemeProvider>` (after the flex div, before `</ThemeProvider>`).

`src/components/site/site-nav.tsx`: replace the aria-hidden kbd `<li>` with a working button:

```tsx
          <li className="hidden sm:block">
            <button
              aria-label="Open command palette"
              className="rounded border border-edge px-1.5 py-0.5 text-xs text-fg-muted transition-colors hover:border-phosphor hover:text-fg"
              onClick={() => window.dispatchEvent(new Event('palette:open'))}
              type="button"
            >
              ⌘K
            </button>
          </li>
```

- [ ] **Step 7: Run tests, gate, commit**

```bash
pnpm exec vitest run src/components/palette src/components/site
pnpm lint && pnpm typecheck && pnpm test
git add src/components/palette src/app/api "src/app/(site)/layout.tsx" src/components/site/site-nav.tsx package.json pnpm-lock.yaml
git commit -m "feat: command palette with post search and nav hint"
```

---

### Task 3: PWA — Serwist, manifest, icons, offline page

**Files:**
- Create: `src/sw.ts`, `src/app/manifest.ts`, `src/app/(site)/~offline/page.tsx`, `scripts/generate-icons.mjs`, `public/icons/icon-192.png` + `icon-512.png` + `icon-512-maskable.png` (generated, committed)
- Modify: `next.config.ts`, `.gitignore` (sw build artifacts), `package.json` (script)
- Test: `src/app/manifest.test.ts` — note: app/** is outside coverage globs, but the test still runs.

**Interfaces:**
- Produces: service worker with precache + `defaultCache` runtime caching (visited posts readable offline) + `/~offline` document fallback; installable manifest.

> **Executed as (post-execution sync note):** Task 3 shipped in Serwist's
> **configurator mode**, not the webpack-mode wiring Step 5 below plans.
> Shipped reality: a root `serwist.config.ts` (swSrc `src/sw.ts`, swDest
> `public/sw.js`) consumed by `serwist build serwist.config.ts`, which
> `pnpm build` runs after `next build`; `next.config.ts` was left untouched
> (no `withSerwistInit`). Registration happens in the root layout via
> `SerwistRegister` (`src/components/site/serwist-register.tsx`), which
> wraps the app in `SerwistProvider` from `@serwist/next/react`
> (`swUrl: '/sw.js'`, disabled outside production). `.gitignore` covers only
> `public/sw.js`(+`.map`) — configurator mode never emits `swe-worker-*`
> files. Emission of the worker is verified by `scripts/ci-build.mjs`, which
> fails the CI build when `public/sw.js` is missing. The steps below are
> preserved as originally planned; Step 5 and the `swe-worker-*` ignore
> lines were NOT executed as written.

- [ ] **Step 1: Install**

```bash
pnpm add @serwist/next && pnpm add -D serwist
```

- [ ] **Step 2: Generate icons**

`scripts/generate-icons.mjs`:

```js
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

function iconSvg(size, { maskable = false } = {}) {
  const radius = maskable ? 0 : Math.round(size * 0.18);
  const fontSize = Math.round(size * (maskable ? 0.28 : 0.34));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#0b0f14"/><text x="50%" y="54%" font-family="Menlo, monospace" font-size="${fontSize}" font-weight="bold" fill="#46e08a" text-anchor="middle" dominant-baseline="middle">~/</text></svg>`;
}

await mkdir('public/icons', { recursive: true });
await sharp(Buffer.from(iconSvg(192))).png().toFile('public/icons/icon-192.png');
await sharp(Buffer.from(iconSvg(512))).png().toFile('public/icons/icon-512.png');
await sharp(Buffer.from(iconSvg(512, { maskable: true })))
  .png()
  .toFile('public/icons/icon-512-maskable.png');
console.log('icons written to public/icons/');
```

Add to package.json scripts: `"generate:icons": "node scripts/generate-icons.mjs"`. Run `pnpm generate:icons` once and COMMIT the three PNGs (builds must not regenerate them).

- [ ] **Step 3: Implement `src/app/manifest.ts`** + test

```ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: '#0b0f14',
    description:
      'Programming blog and consulting site of Michaux Kelley — full-stack AI forward deployed engineer.',
    display: 'standalone',
    icons: [
      { sizes: '192x192', src: '/icons/icon-192.png', type: 'image/png' },
      { sizes: '512x512', src: '/icons/icon-512.png', type: 'image/png' },
      {
        purpose: 'maskable',
        sizes: '512x512',
        src: '/icons/icon-512-maskable.png',
        type: 'image/png',
      },
    ],
    name: 'mkelley33',
    short_name: 'mkelley33',
    start_url: '/',
    theme_color: '#0b0f14',
  };
}
```

`src/app/manifest.test.ts`:

```ts
import manifest from '@/app/manifest';

describe('manifest', () => {
  it('is installable: name, start_url, display, and both icon sizes', () => {
    const result = manifest();
    expect(result.name).toBe('mkelley33');
    expect(result.start_url).toBe('/');
    expect(result.display).toBe('standalone');
    const sizes = (result.icons ?? []).map((icon) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });
});
```

- [ ] **Step 4: Implement `src/sw.ts`**

```ts
/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import { Serwist } from 'serwist';

import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  clientsClaim: true,
  fallbacks: {
    entries: [
      {
        matcher({ request }) {
          return request.destination === 'document';
        },
        url: '/~offline',
      },
    ],
  },
  navigationPreload: true,
  precacheEntries: self.__SW_MANIFEST,
  runtimeCaching: defaultCache,
  skipWaiting: true,
});

serwist.addEventListeners();
```

(If eslint flags the triple-slash reference, add a scoped disable comment. If `tsc` complains about the webworker lib, that reference line is the fix — do not modify tsconfig lib globally.)

- [ ] **Step 5: Wire `next.config.ts`**

> **Not executed as written** — superseded by configurator mode; see the
> "Executed as" note at the top of this task. `next.config.ts` is untouched.

```ts
import type { NextConfig } from 'next';

import { withPayload } from '@payloadcms/next/withPayload';
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  disable: process.env.NODE_ENV !== 'production',
  swDest: 'public/sw.js',
  swSrc: 'src/sw.ts',
});

const nextConfig: NextConfig = {};

export default withSerwist(withPayload(nextConfig));
```

Append to `.gitignore`:

```
# serwist build output
public/sw.js
public/sw.js.map
public/swe-worker-*.js
public/swe-worker-*.js.map
```

- [ ] **Step 6: Implement `src/app/(site)/~offline/page.tsx`**

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'offline',
};

export default function OfflinePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <p className="font-mono text-sm text-fg-muted">
        <span className="text-phosphor">$</span> ping mkelley33.com
      </p>
      <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight">
        <span aria-hidden="true"># </span>offline
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-fg-muted">
        no connection — posts you&apos;ve already read are still available from
        the cache. everything else needs a network.
      </p>
    </div>
  );
}
```

- [ ] **Step 7: Gate and commit**

```bash
pnpm exec vitest run src/app/manifest.test.ts
pnpm lint && pnpm typecheck && pnpm test && pnpm build:ci
git add src/sw.ts src/app/manifest.ts src/app/manifest.test.ts "src/app/(site)/~offline" scripts/generate-icons.mjs public/icons next.config.ts .gitignore package.json pnpm-lock.yaml
git commit -m "feat: installable pwa — serwist worker, manifest, icons, offline page"
```

(build:ci here verifies the Serwist integration compiles in a production build; check the output still lists all routes.)

---

### Task 4: OG images (next/og)

**Files:**
- Create: `src/assets/fonts/JetBrainsMono-Bold.ttf` (downloaded, committed), `src/app/opengraph-image.tsx`, `src/app/(site)/blog/[slug]/opengraph-image.tsx`
- Modify: `src/app/(site)/layout.tsx` (twitter card metadata)

**Interfaces:**
- Produces: default site OG image; per-post terminal-styled OG. File-convention routes auto-wire `og:image`.

- [ ] **Step 1: Commit the font**

```bash
mkdir -p src/assets/fonts
curl -fsSL -o src/assets/fonts/JetBrainsMono-Bold.ttf https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/ttf/JetBrainsMono-Bold.ttf
```

(JetBrains Mono is OFL-licensed; committing the TTF is permitted. If the URL 404s, use the latest release asset from github.com/JetBrains/JetBrainsMono/releases and note the deviation.)

- [ ] **Step 2: Implement `src/app/opengraph-image.tsx`**

```tsx
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

import { siteConfig } from '@/lib/site-config';

export const alt = 'mkelley33 — full-stack AI forward deployed engineer';
export const contentType = 'image/png';
export const size = { height: 630, width: 1200 };

export default async function Image() {
  const mono = await readFile(
    join(process.cwd(), 'src/assets/fonts/JetBrainsMono-Bold.ttf'),
  );
  return new ImageResponse(
    (
      <div
        style={{
          backgroundColor: '#0b0f14',
          color: '#d7e2e9',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'JetBrains Mono',
          height: '100%',
          justifyContent: 'center',
          padding: 80,
          width: '100%',
        }}
      >
        <div style={{ color: '#46e08a', fontSize: 36 }}>$ whoami</div>
        <div style={{ fontSize: 72, fontWeight: 700, marginTop: 24 }}>
          {siteConfig.name}
        </div>
        <div style={{ color: '#46e08a', fontSize: 38, marginTop: 16 }}>
          {siteConfig.tagline}
        </div>
        <div style={{ color: '#7d93a5', fontSize: 28, marginTop: 48 }}>
          mkelley33.com
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { data: mono, name: 'JetBrains Mono', style: 'normal', weight: 700 },
      ],
    },
  );
}
```

- [ ] **Step 3: Implement `src/app/(site)/blog/[slug]/opengraph-image.tsx`**

```tsx
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

import { getPostBySlug } from '@/lib/repositories/posts';

export const alt = 'blog post — mkelley33.com';
export const contentType = 'image/png';
export const size = { height: 630, width: 1200 };

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  const mono = await readFile(
    join(process.cwd(), 'src/assets/fonts/JetBrainsMono-Bold.ttf'),
  );
  const title = post?.title ?? 'command not found';
  const date = post?.publishedAt.slice(0, 10) ?? '';
  const tags = (post?.tags ?? []).map((tag) => `#${tag}`).join('  ');
  return new ImageResponse(
    (
      <div
        style={{
          backgroundColor: '#0b0f14',
          color: '#d7e2e9',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'JetBrains Mono',
          height: '100%',
          justifyContent: 'center',
          padding: 80,
          width: '100%',
        }}
      >
        <div style={{ color: '#46e08a', fontSize: 32 }}>
          $ cat ./blog/{slug}.mdx
        </div>
        <div
          style={{
            fontSize: title.length > 40 ? 56 : 68,
            fontWeight: 700,
            marginTop: 28,
          }}
        >
          {title}
        </div>
        <div style={{ color: '#7d93a5', display: 'flex', fontSize: 26, gap: 32, marginTop: 40 }}>
          <span>{date}</span>
          <span style={{ color: '#46e08a' }}>{tags}</span>
        </div>
        <div style={{ color: '#7d93a5', fontSize: 24, marginTop: 48 }}>
          mkelley33.com
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { data: mono, name: 'JetBrains Mono', style: 'normal', weight: 700 },
      ],
    },
  );
}
```

- [ ] **Step 4: Twitter card metadata**

In `src/app/(site)/layout.tsx` metadata export, add:

```ts
  twitter: { card: 'summary_large_image' },
```

- [ ] **Step 5: Gate and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build:ci
git add src/assets src/app/opengraph-image.tsx "src/app/(site)/blog/[slug]/opengraph-image.tsx" "src/app/(site)/layout.tsx"
git commit -m "feat: generated terminal-styled og images for site and posts"
```

(build:ci verifies the OG routes compile; the per-post OG renders on demand under ISR.)

---

### Task 5: A11y structure — skip link, headings, theme sync, backlog tests

**Files:**
- Create: `src/components/site/theme-color-sync.tsx` + test
- Modify: `src/app/(site)/layout.tsx` (skip link, main id, ThemeColorSync mount), `src/components/home/terminal-section.tsx` (command line → h2), `src/components/site/theme-toggle.tsx` (dynamic label)
- Test: `src/components/site/theme-color-sync.test.tsx`; extend `theme-toggle.test.tsx`, `theme-provider.test.tsx` (prop forwarding — P1 backlog), `site-nav.test.tsx` (isActive nested route — P1 backlog), `terminal-section.test.tsx` (h2)

**Interfaces:**
- Produces: `ThemeColorSync()` (keeps `<meta name="theme-color">` in step with the manual toggle); TerminalSection commands become the home page's h2 outline.

- [ ] **Step 1: Write/extend the failing tests**

`src/components/site/theme-color-sync.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { vi } from 'vitest';

import { ThemeColorSync } from '@/components/site/theme-color-sync';

const themeState = { resolvedTheme: 'dark' as string | undefined };

vi.mock('next-themes', () => ({
  useTheme: () => themeState,
}));

describe('ThemeColorSync', () => {
  it('stamps the theme-color meta for the resolved theme', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.append(meta);
    themeState.resolvedTheme = 'dark';
    render(<ThemeColorSync />);
    expect(meta.getAttribute('content')).toBe('#0b0f14');
    meta.remove();
  });

  it('uses the light value when resolved light', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.append(meta);
    themeState.resolvedTheme = 'light';
    render(<ThemeColorSync />);
    expect(meta.getAttribute('content')).toBe('#f4f7f5');
    meta.remove();
  });
});
```

Extend `src/components/site/theme-toggle.test.tsx` with:

```tsx
  it('labels the toggle with the destination theme', async () => {
    render(<ThemeToggle />);
    expect(
      await screen.findByRole('button', { name: /switch to (light|dark) theme/i }),
    ).toBeInTheDocument();
  });
```

Extend `src/components/site/site-nav.test.tsx` with a nested-route case (follow the file's existing usePathname mock pattern — make the mocked value settable per test):

```tsx
  it('marks ./blog current on a nested post route', () => {
    mockPathname.value = '/blog/create-a-nextjs-blog';
    render(<SiteNav />);
    expect(screen.getByRole('link', { name: './blog' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
```

Extend `src/components/site/theme-provider.test.tsx` (P1 backlog: prop forwarding) — mock `next-themes` capturing props and assert `attribute="class"`, `defaultTheme="system"`, and children render. Follow the existing test file's structure.

Extend `src/components/home/terminal-section.test.tsx`: assert the command renders as a level-2 heading (`getByRole('heading', { level: 2, name: /tail -3/ })` style, matching whatever command the test already uses).

Run the four files — Expected: FAIL.

- [ ] **Step 2: Implement `src/components/site/theme-color-sync.tsx`**

```tsx
'use client';

import { useTheme } from 'next-themes';
import { useEffect } from 'react';

// Palette values mirrored from globals.css — hex required because this
// writes a meta tag, outside CSS token reach (plan-sanctioned).
const THEME_COLORS: Record<string, string> = {
  dark: '#0b0f14',
  light: '#f4f7f5',
};

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color = THEME_COLORS[resolvedTheme ?? 'light'];
    if (!color) {
      return;
    }
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute('content', color);
    }
  }, [resolvedTheme]);

  return null;
}
```

- [ ] **Step 3: Layout — skip link, main id, sync mount**

In `src/app/(site)/layout.tsx`:
- First child inside `<body>` (before ThemeProvider):

```tsx
        <a
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:border focus:border-phosphor focus:bg-surface focus:px-3 focus:py-2 focus:font-mono focus:text-sm"
          href="#main"
        >
          skip to content
        </a>
```

- `<main className="flex-1">` → `<main className="flex-1" id="main">`
- `<ThemeColorSync />` rendered inside ThemeProvider (next to PaletteMount).

- [ ] **Step 4: TerminalSection h2 + ThemeToggle label**

`terminal-section.tsx`: the command `<p>` becomes `<h2>` with identical classes, `$` span gains `aria-hidden="true"`.

`theme-toggle.tsx` aria-label:

```tsx
      aria-label={
        !mounted
          ? 'Toggle theme'
          : resolvedTheme === 'dark'
            ? 'Switch to light theme'
            : 'Switch to dark theme'
      }
```

- [ ] **Step 5: Run tests, gate, commit**

```bash
pnpm exec vitest run src/components/site src/components/home/terminal-section.test.tsx
pnpm lint && pnpm typecheck && pnpm test
git add src/components/site "src/app/(site)/layout.tsx" src/components/home/terminal-section.tsx src/components/home/terminal-section.test.tsx
git commit -m "feat: skip link, home heading outline, theme toggle a11y, theme-color sync"
```

---

### Task 6: Consistency sweep — prefixes, h1 copy, ErrorText, links, print

**Files:**
- Create: `src/components/ui/error-text.tsx` + `error-text.test.tsx`
- Modify: `src/components/contact/contact-form.tsx`, `src/components/newsletter/newsletter-form.tsx` (ErrorText adoption), `src/app/(site)/services/page.tsx`, `uses/page.tsx`, `contact/page.tsx`, `blog/page.tsx`, `blog/[slug]/page.tsx`, `not-found.tsx`, `src/components/cv/cv-document.tsx`, `src/components/site/site-footer.tsx`, `src/components/home/*` beats where bare glyphs remain, `src/app/(site)/globals.css` (print shiki)
- Test: existing component tests updated ONLY where accessible names intentionally change; `error-text.test.tsx` new.

This is a mechanical sweep. The convention (now site-wide): every decorative `$` / `#` / `▸` / `#{tag}`-hash glyph is wrapped `<span aria-hidden="true">…</span>`; the meaningful text stays exposed. Page h1s use lowercase terminal voice.

- [ ] **Step 1: ErrorText primitive + test**

`src/components/ui/error-text.tsx`:

```tsx
import type { ReactNode } from 'react';

export function ErrorText({
  children,
  id,
  role,
  size = 'xs',
}: {
  children: ReactNode;
  id?: string;
  role?: 'alert' | 'status';
  size?: 'sm' | 'xs';
}) {
  return (
    <p
      className={`font-mono text-fg-muted ${size === 'sm' ? 'text-sm' : 'text-xs'}`}
      id={id}
      role={role}
    >
      <span aria-hidden="true"># </span>
      {children}
    </p>
  );
}
```

`src/components/ui/error-text.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { ErrorText } from '@/components/ui/error-text';

describe('ErrorText', () => {
  it('renders the message with id, role, and hidden prefix', () => {
    render(
      <ErrorText id="err-1" role="alert" size="sm">
        something broke
      </ErrorText>,
    );
    const text = screen.getByText('something broke');
    expect(text.closest('p')).toHaveAttribute('id', 'err-1');
    expect(text.closest('p')).toHaveAttribute('role', 'alert');
    expect(text.closest('p')).toHaveClass('text-sm');
  });
});
```

Adopt in `contact-form.tsx` (6 error/status paragraphs) and `newsletter-form.tsx` (3 paragraphs). Where the old `<p>` carried a margin class (`mt-1`, `mt-2`), wrap the ErrorText call in `<div className="mt-1">…</div>` with that exact class — ErrorText itself never takes margins. All existing ids/roles preserved so current tests keep passing — run them to prove it.

- [ ] **Step 2: h1 + prompt sweep**

- `services/page.tsx`: `# Services` → `# services` (span-wrapped `#`); prompt line `$` span `aria-hidden`.
- `uses/page.tsx`: `# Uses` → `# uses` (span-wrapped); prompt `$` aria-hidden; section `h2` `{heading}/` unchanged (meaningful).
- `contact/page.tsx`: `# Contact` → `# contact` (span-wrapped); both prompt `$` spans aria-hidden.
- `blog/page.tsx`: convert its prompt line to the site idiom (`text-fg-muted` line with phosphor aria-hidden `$`), span-wrap the `#` in `# blog`.
- `blog/[slug]/page.tsx`: span-wrap the h1 `#`; add `aria-hidden="true"` to the breadcrumb `$` span; tags `#{tag}` → `<span aria-hidden="true">#</span>{tag}` inside the existing phosphor span.
- `not-found.tsx`: same treatment for any bare `$`/`#` glyphs.
- `cv-document.tsx`: SectionHeading `#` prefix → span-wrapped aria-hidden (verify cv-document tests still pass — they query by heading text, which RTL normalizes; if an exact-match assertion breaks, adjust the test's matcher, note it).
- Home beats: audit `career-beat`, `open-source-beat`, `about-beat`, `latest-posts-beat`, `services-beat` for bare `$`/`#`/`▸` glyphs and apply the convention (TerminalSection's `$` was done in Task 5).

- [ ] **Step 3: External-link affordance + copyleft**

- `site-footer.tsx`: every `target="_blank"` anchor gains `<span className="sr-only"> (opens in new tab)</span>` before `</a>`; the `🄯` glyph becomes `<span aria-hidden="true">🄯</span> copyleft` (text survives missing-glyph fonts).
- Apply the `link-draw` utility (Task 1) to the nav links in `site-nav.tsx` and the footer's inline text links — the spec's CSS-only "link underline draws". Skip ButtonLink/CTA-styled links (they have border treatments).
- `uses/page.tsx` view-source link and `open-source-beat.tsx` external links: same sr-only suffix.
- Update any test whose accessible-name assertion now fails by switching it to a regex prefix match (e.g. `name: /github/`) — these are intentional name extensions; list each in your report.

- [ ] **Step 4: Print shiki fix**

Append inside the existing `@media print` block in globals.css:

```css
  .shiki,
  .shiki span,
  .dark .shiki,
  .dark .shiki span {
    background-color: #ffffff !important;
    color: #000000 !important;
    font-style: normal !important;
    font-weight: normal !important;
    text-decoration: none !important;
  }
```

(The `.dark`-prefixed selectors are required — the existing dark Shiki rules are `!important` at higher specificity.)

- [ ] **Step 5: Run tests, gate, commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A src/components src/app
git commit -m "feat: site-wide a11y prefix convention, lowercase h1s, error-text, print code blocks"
```

---

### Task 7: Functional backlog fixes + analytics

**Files:**
- Modify: `src/components/contact/contact-form.tsx` (+test), `src/lib/repositories/subscribers.ts` (+int test), `src/lib/email/transport.ts` (+test), `src/app/(site)/layout.tsx`
- Add dep: `@vercel/analytics`

- [ ] **Step 1: Contact form — clear services on reason switch**

In `contact-form.tsx`, the reason `<select>` registration becomes:

```tsx
          {...form.register('reason', {
            onChange: (event) => {
              if (event.target.value !== 'services') {
                form.setValue('requestedServices', [], {
                  shouldValidate: false,
                });
              }
            },
          })}
```

Add a test to `contact-form.test.tsx`: select reason services → pick a service in the dialog → chip visible → switch reason to `general` → chip gone; then submit a valid form and assert `submitContact` received `requestedServices: []`.

- [ ] **Step 2: Subscribers — confirmedAt reset + duplicate-create race**

In `upsertPendingSubscriber`'s update branch, add `confirmedAt: null` alongside the existing fields. Wrap the create branch:

```ts
  } else {
    try {
      await payload.create({
        collection: 'subscribers',
        data: { confirmToken: token.hash, email: normalized, status: 'pending' },
        overrideAccess: true,
      });
    } catch (error) {
      // Unique-index race: another request created this email between our
      // find and create. Re-arm the existing doc instead of failing the user.
      if (error instanceof Error && error.message.includes('E11000')) {
        const raced = await findByEmail(normalized);
        if (raced) {
          await payload.update({
            collection: 'subscribers',
            data: {
              confirmToken: token.hash,
              confirmedAt: null,
              status: 'pending',
              unsubscribedAt: null,
            },
            id: raced.id,
            overrideAccess: true,
          });
          return { alreadyActive: false, rawToken: token.raw };
        }
      }
      throw error;
    }
  }
```

(Duplicate the update-branch data object rather than extracting a helper — two sites, and the race branch intentionally re-arms everything. The race branch itself is untestable without fault injection; the confirmedAt reset IS testable.) Add an int test: subscribe → confirm → unsubscribe → re-subscribe → assert status pending AND `confirmedAt` is null.

- [ ] **Step 3: Transport — requireTLS + json-transport visibility**

In `createTransport`'s SMTP branch add `requireTLS: port !== 465,` to the options. In `sendEmail`, after a successful `sendMail`, log the JSON transport's message so E2E (Task 8) can scrape confirm links:

```ts
    const info: unknown = await transporter.sendMail({ ... });
    if (
      !process.env.SMTP_HOST &&
      info !== null &&
      typeof info === 'object' &&
      'message' in info &&
      typeof (info as { message: unknown }).message === 'string'
    ) {
      console.info('email (not sent):', (info as { message: string }).message);
    }
    return true;
```

Extend `transport.test.ts`: with SMTP_HOST unset, spy `console.info` and assert it was called with a first argument `'email (not sent):'`.

- [ ] **Step 4: Vercel Analytics**

```bash
pnpm add @vercel/analytics
```

In `src/app/(site)/layout.tsx`: `import { Analytics } from '@vercel/analytics/next';` and render `<Analytics />` as the last child of `<body>` (after the JSON-LD script). Zero-config; inert outside Vercel.

- [ ] **Step 5: Run tests, gate, commit**

```bash
pnpm exec vitest run src/components/contact src/lib/repositories/subscribers.int.test.ts src/lib/email
pnpm lint && pnpm typecheck && pnpm test
git add src/components/contact src/lib/repositories/subscribers.ts src/lib/repositories/subscribers.int.test.ts src/lib/email "src/app/(site)/layout.tsx" package.json pnpm-lock.yaml
git commit -m "fix: reason-switch service clearing, subscriber race and hygiene, tls, analytics"
```

---

### Task 8: Playwright E2E + CI job + full gate

**Files:**
- Create: `playwright.config.ts`, `scripts/e2e.mjs`, `e2e/contact.spec.ts`, `e2e/newsletter.spec.ts`, `e2e/theme.spec.ts`, `e2e/palette.spec.ts`, `e2e/blog.spec.ts`
- Modify: `package.json` (scripts), `.github/workflows/ci.yml` (e2e job), `.gitignore` (playwright artifacts), vitest config ONLY if `e2e/**` isn't already excluded (check `include` globs first)

- [ ] **Step 1: Install and configure**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

`playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  reporter: process.env.CI ? 'github' : 'list',
  retries: process.env.CI ? 1 : 0,
  testDir: 'e2e',
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
});
```

package.json scripts: `"e2e": "node scripts/e2e.mjs"`, `"e2e:test": "playwright test"`. `.gitignore`: add `test-results/`, `playwright-report/`, `e2e-server.log`.

- [ ] **Step 2: Implement `scripts/e2e.mjs`** (boots mongod, builds, seeds real content, serves, runs Playwright)

```js
import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const mongod = await MongoMemoryServer.create({
  instance: { args: ['--wiredTigerCacheSizeGB', '0.25'] },
});
const env = {
  ...process.env,
  DATABASE_URL: `${mongod.getUri()}?connectTimeoutMS=120000&serverSelectionTimeoutMS=120000`,
  PAYLOAD_SECRET: 'e2e-secret',
};

let status = 1;
let server;
try {
  for (const step of [
    ['pnpm', ['build']],
    ['pnpm', ['seed:services']],
    ['pnpm', ['migrate:posts']],
  ]) {
    const result = spawnSync(step[0], step[1], { env, stdio: 'inherit' });
    if (result.status !== 0) {
      console.error(`${step[1].join(' ')} failed`);
      process.exit(result.status ?? 1);
    }
  }
  server = spawn('pnpm', ['start'], { env });
  const log = createWriteStream('e2e-server.log');
  server.stdout.pipe(log);
  server.stderr.pipe(log);
  let ready = false;
  for (let i = 0; i < 90 && !ready; i += 1) {
    try {
      const response = await fetch('http://localhost:3000');
      ready = response.ok;
    } catch {
      await sleep(1000);
    }
  }
  if (!ready) {
    console.error('server never became ready');
    process.exit(1);
  }
  const pw = spawnSync('pnpm', ['exec', 'playwright', 'test'], {
    env: { ...env, E2E_BASE_URL: 'http://localhost:3000' },
    stdio: 'inherit',
  });
  status = pw.status ?? 1;
} finally {
  server?.kill();
  await mongod.stop();
}
process.exit(status);
```

(Node's env precedence means `.env.local` loaded by the seed/migrate scripts' `--env-file-if-exists` does NOT override the DATABASE_URL we pass — existing environment wins. The seeded content is the REAL 4 migrated posts + 5 services.)

- [ ] **Step 3: Write the five specs**

`e2e/contact.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('contact happy path with services picker', async ({ page }) => {
  await page.goto('/contact?reason=services&service=ai-enablement');
  await expect(page.getByText('AI enablement')).toBeVisible();
  await page.getByRole('button', { name: /select services/ }).click();
  await page.getByRole('checkbox', { name: 'Product development' }).check();
  await page.getByRole('button', { name: 'done' }).click();
  await page.getByLabel('name').fill('E2E Tester');
  await page.getByLabel('email').fill('e2e@example.com');
  await page
    .getByLabel('message')
    .fill('End-to-end check of the contact flow.');
  await page.waitForTimeout(2500); // Turnstile test key auto-solves
  await page.getByRole('button', { name: /send-message/ }).click();
  await expect(page.getByText('message queued ✓')).toBeVisible({
    timeout: 15_000,
  });
});
```

`e2e/newsletter.spec.ts`:

```ts
import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

test('newsletter opt-in confirm round trip', async ({ page }) => {
  await page.goto('/');
  const form = page.locator('form').filter({ hasText: 'subscribe' });
  await form.getByLabel('email').fill('optin@example.com');
  await page.waitForTimeout(2500); // Turnstile test key auto-solves
  await form.getByRole('button', { name: /subscribe/ }).click();
  await expect(page.getByText(/check your inbox to confirm/)).toBeVisible({
    timeout: 15_000,
  });
  let token = '';
  await expect(async () => {
    const log = await readFile('e2e-server.log', 'utf8');
    const match = /\/newsletter\/confirm\?token=([0-9a-f]{64})/.exec(log);
    if (!match) {
      throw new Error('confirm link not in server log yet');
    }
    token = match[1];
  }).toPass({ timeout: 15_000 });
  await page.goto(`/newsletter/confirm?token=${token}`);
  await expect(page.getByText('subscribed ✓')).toBeVisible();
});
```

`e2e/theme.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('theme toggle persists across reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});
```

`e2e/palette.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('command palette navigates to services', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByText('./services').click();
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.getByRole('heading', { name: /services/ })).toBeVisible();
});
```

`e2e/blog.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('migrated post renders with terminal code blocks', async ({ page }) => {
  await page.goto('/blog/create-a-nextjs-blog');
  await expect(
    page.getByRole('heading', { name: /create a next\.js blog/i }),
  ).toBeVisible();
  await expect(page.locator('pre.shiki').first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: /copy/i }).first(),
  ).toBeVisible();
});
```

(If a locator doesn't match the real DOM — e.g. the blog h1's exact casing or the copy button's accessible name — fix the LOCATOR to match the shipped DOM, never the DOM to match the test, and record it.)

- [ ] **Step 4: Verify Vitest exclusion, run E2E locally**

Check the Vitest config's `include` globs; if they could match `e2e/**`, add an explicit `exclude`. Then:

```bash
pnpm e2e
```

Expected: build + seed + 5 specs pass. (This runs a full production build — the build:ci flake protocol applies: one retry on infra failure.)

- [ ] **Step 5: Add the CI job**

Append to `.github/workflows/ci.yml` jobs:

```yaml
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - uses: actions/cache@v4
        with:
          path: ~/.cache/mongodb-binaries
          key: mongodb-binaries-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
          restore-keys: |
            mongodb-binaries-${{ runner.os }}-
      - uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

- [ ] **Step 6: Full phase gate and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build:ci
git add playwright.config.ts scripts/e2e.mjs e2e .github/workflows/ci.yml .gitignore package.json pnpm-lock.yaml
git commit -m "feat: playwright e2e suite for launch flows with ci job"
```

(Phase gate: coverage thresholds must hold across everything Phase 5 added.)

---

## Deferred / accepted (do not implement)

- Newsletter timing side-channel (active subscriber skips the awaited send): accepted — fire-and-forget is unsafe on serverless, constant-work is overkill at this scale.
- E11000 race branch has no automated test (fault injection not worth the harness).
- Lighthouse ≥90 verification needs a deployed URL → owner runbook.
- PWA icons are generated placeholders — owner may supply branded ones (rerun `pnpm generate:icons` replacement or drop files in `public/icons/`).
- Prod hard-guard for missing TURNSTILE_SECRET_KEY/SMTP_HOST: still an open owner decision (Phase 4 escalation); loud error logging ships already.

## Owner runbook (post-merge, not agent tasks)

- Run Lighthouse (mobile + desktop) against the Vercel preview; budget ≥90 all categories.
- Verify PWA installability in Chrome (manifest + sw) on the preview; check offline reading of a visited post.
- Vercel dashboard: Analytics appears automatically once `@vercel/analytics` is deployed.
- Still open from Phase 4: SES production access, real Turnstile keys, SMTP creds, `CONTACT_TO`; headshot → `siteConfig.headshot`; resume PDF → `siteConfig.resumePdf`; Bluesky URL; decide the prod fail-open/hard-fail question.
- Consider retitling the boudreaux-titled CLAUDE.md/AGENTS.md now in the repo root.
