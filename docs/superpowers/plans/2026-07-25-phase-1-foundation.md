# Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployable, themed Next.js 16 shell of mkelley33.com — Phosphor palette with light/dark themes, fonts, nav, footer, placeholder home hero, terminal 404 — with Vitest/RTL, ESLint 9, and CI wired up.

**Architecture:** Manual scaffold of a Next.js 16 App Router app (the repo already has `package.json`/`.nvmrc`, so no `create-next-app`). Tailwind CSS 4 CSS-first tokens implement the spec palette; next-themes provides class-strategy theming (system → light fallback); all site chrome components live in `src/components/site/` and read shared values from `src/lib/site-config.ts`.

**Tech Stack:** Next.js 16, React 19, TypeScript (strict, ES2022+), Tailwind CSS 4, next-themes, next/font (Inter + JetBrains Mono), Vitest + React Testing Library, ESLint 9 flat config, GitHub Actions, pnpm.

**Phase roadmap:** This is Plan 1 of 5 (Foundation → Content platform → Site pages → Forms & email → Polish). Later plans are written after this one executes. Spec: `docs/superpowers/specs/2026-07-25-mkelley33-redesign-design.md`.

## Global Constraints

- Package manager: `pnpm@10.12.4` (already in `package.json` — keep). Node version comes from `.nvmrc`.
- TypeScript strict mode; ES2022+; never `any`.
- Named exports only. Exceptions: Next.js route files (`page.tsx`/`layout.tsx`/`not-found.tsx`) and tool-loader config files (`next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`), which require default exports.
- Files kebab-case; components PascalCase; tests colocated next to source as `<name>.test.tsx`.
- Palette (copy verbatim, from spec §2): dark `--bg #0b0f14`, `--surface #10161d`, `--border #223140`, `--text #d7e2e9`, `--text-muted #7d93a5`, `--accent #46e08a`; light `--bg #f4f7f5`, `--surface #ffffff`, `--border #d8e2dc`, `--text #17211c`, `--text-muted #5c6f66`, `--accent #0d9155`.
- Theme: class strategy, system preference → light fallback, manual `◐` toggle.
- Typography: JetBrains Mono (chrome/headings/labels), Inter (prose), self-hosted via `next/font` — no runtime font requests.
- Mobile-first: base styles are the mobile layout; `sm:`/`md:` add desktop refinement.
- Accessibility: visible `:focus-visible` outlines in accent color; `aria-current` on active nav link; every icon-ish control has an accessible name.
- Every commit message ends with the standard trailer:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` and the `Claude-Session:` line for the executing session.
- Known, accepted gap: nav/CTA links to `/blog`, `/services`, `/cv`, `/contact` will 404 until Phases 2–4; the custom 404 page makes that tolerable in the interim.

---

### Task 1: Next.js 16 scaffold

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a bootable Next.js app; `src/app/layout.tsx` (RootLayout default export) that later tasks modify; path alias `@/*` → `src/*`.

- [ ] **Step 1: Add dependencies**

```bash
pnpm add next react react-dom
pnpm add -D typescript @types/node @types/react @types/react-dom tailwindcss @tailwindcss/postcss postcss
```

Expected: `package.json` gains `next` 16.x, `react`/`react-dom` 19.x, `tailwindcss` 4.x. Verify with `pnpm ls next react tailwindcss`.

- [ ] **Step 2: Replace `package.json` scripts block**

Edit `package.json` so the `scripts` object is exactly:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

Also remove the scaffold cruft fields `"main": "index.js"`, `"description": ""`, `"keywords": []`, `"author": ""` and add `"private": true`.

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `next.config.ts`**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 5: Create `postcss.config.mjs`**

```javascript
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
```

- [ ] **Step 6: Create minimal `src/app/globals.css`** (full tokens come in Task 4)

```css
@import 'tailwindcss';
```

- [ ] **Step 7: Create `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Michaux Kelley — Full-Stack AI Forward Deployed Engineer',
  description:
    'Production React, Next.js, and Node.js engineering — and AI-assisted development, deployed forward into teams.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Create placeholder `src/app/page.tsx`** (replaced in Task 7)

```tsx
export default function HomePage() {
  return <main className="p-8 font-mono">~/mkelley33 — coming online</main>;
}
```

- [ ] **Step 9: Verify the app builds and boots**

```bash
pnpm build
```

Expected: `✓ Compiled successfully`, route `/` listed as static. Then `pnpm dev` briefly, open http://localhost:3000, confirm the placeholder text renders, Ctrl-C.

- [ ] **Step 10: Update `.gitignore` and commit**

Append to `.gitignore`:

```
.next/
next-env.d.ts
coverage/
*.tsbuildinfo
```

```bash
git add package.json pnpm-lock.yaml tsconfig.json next.config.ts postcss.config.mjs src/ .gitignore
git commit -m "feat: scaffold Next.js 16 app with Tailwind 4 and TypeScript strict"
```

---

### Task 2: Vitest + React Testing Library setup

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `src/test/setup-verification.test.tsx`

**Interfaces:**
- Consumes: `@/*` path alias from Task 1.
- Produces: `pnpm test` runner; global jsdom environment; `window.matchMedia` mock (required by next-themes in Task 4); jest-dom matchers available in all tests.

- [ ] **Step 1: Add dev dependencies**

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    coverage: {
      include: ['src/components/**', 'src/lib/**'],
      provider: 'v8',
      thresholds: { branches: 90, functions: 90, lines: 90, statements: 90 },
    },
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest';

import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query: string) => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  })),
  writable: true,
});
```

- [ ] **Step 4: Write the setup-verification test**

Create `src/test/setup-verification.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

describe('test environment', () => {
  it('renders into jsdom with jest-dom matchers', () => {
    render(<button type="button">ok</button>);
    expect(screen.getByRole('button', { name: 'ok' })).toBeInTheDocument();
  });

  it('mocks window.matchMedia for next-themes', () => {
    const result = window.matchMedia('(prefers-color-scheme: dark)');
    expect(result.matches).toBe(false);
  });
});
```

- [ ] **Step 5: Run the tests**

```bash
pnpm test
```

Expected: `2 passed`.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts vitest.setup.ts src/test/ package.json pnpm-lock.yaml
git commit -m "test: add Vitest + React Testing Library setup with matchMedia mock"
```

---

### Task 3: ESLint 9 flat config

**Files:**
- Create: `eslint.config.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: `pnpm lint` passing; import sorting enforced by `perfectionist/sort-imports` (all later tasks' code is written to satisfy it).

- [ ] **Step 1: Add dev dependencies**

```bash
pnpm add -D eslint@^9 eslint-config-next eslint-plugin-perfectionist
```

- [ ] **Step 2: Create `eslint.config.mjs`**

```javascript
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import perfectionist from 'eslint-plugin-perfectionist';

const eslintConfig = [
  { ignores: ['.next/**', 'coverage/**', 'node_modules/**', 'next-env.d.ts'] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: { perfectionist },
    rules: {
      'perfectionist/sort-imports': 'error',
    },
  },
];

export default eslintConfig;
```

(ESLint is pinned to ^9 — ESLint 10 is incompatible with eslint-config-next 16. The config uses eslint-config-next's native flat exports; FlatCompat crashes against them.)

- [ ] **Step 3: Run lint and fix anything it reports**

```bash
pnpm lint
```

Expected: exits 0. If `perfectionist/sort-imports` flags existing files, run `pnpm lint --fix` and re-run to confirm clean.

- [ ] **Step 4: Commit**

```bash
git add eslint.config.mjs package.json pnpm-lock.yaml src/
git commit -m "chore: add ESLint 9 flat config with next presets and import sorting"
```

---

### Task 4: Phosphor theme tokens, fonts, and theme toggle

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `src/components/site/theme-provider.tsx`
- Create: `src/components/site/theme-toggle.tsx`
- Test: `src/components/site/theme-toggle.test.tsx`

**Interfaces:**
- Consumes: matchMedia mock from Task 2.
- Produces: Tailwind utilities `bg-canvas`, `bg-surface`, `border-edge`, `text-fg`, `text-fg-muted`, `text-phosphor`, `border-phosphor`, `font-mono`, `font-sans`, `bg-blueprint` (all later UI tasks use these); `ThemeProvider` (props: `children: React.ReactNode`) wrapping the app; `ThemeToggle` (no props) rendering the `◐` button.

- [ ] **Step 1: Add next-themes**

```bash
pnpm add next-themes
```

- [ ] **Step 2: Write the failing ThemeToggle test**

Create `src/components/site/theme-toggle.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';

import { ThemeToggle } from '@/components/site/theme-toggle';

function renderToggle() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
  afterEach(() => {
    document.documentElement.className = '';
    window.localStorage.clear();
  });

  it('renders a button with an accessible name', async () => {
    renderToggle();
    expect(
      await screen.findByRole('button', { name: /toggle theme/i }),
    ).toBeInTheDocument();
  });

  it('toggles the dark class on <html>', async () => {
    const user = userEvent.setup();
    renderToggle();
    const button = await screen.findByRole('button', { name: /toggle theme/i });

    await user.click(button);
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));

    await user.click(button);
    await waitFor(() =>
      expect(document.documentElement).not.toHaveClass('dark'),
    );
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `@/components/site/theme-toggle`.

- [ ] **Step 4: Implement provider and toggle**

Create `src/components/site/theme-provider.tsx`:

```tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
```

Create `src/components/site/theme-toggle.tsx`:

```tsx
'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      aria-label="Toggle theme"
      className="text-fg-muted transition-colors hover:text-phosphor"
      disabled={!mounted}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      type="button"
    >
      ◐
    </button>
  );
}
```

Note: `matchMedia.matches` is mocked `false`, so with `defaultTheme="light"` in the test the first click resolves to `dark` — matching the assertions.

- [ ] **Step 5: Replace `src/app/globals.css` with the full token sheet**

```css
@import 'tailwindcss';

@custom-variant dark (&:where(.dark, .dark *));

:root {
  color-scheme: light;
  --bg: #f4f7f5;
  --surface: #ffffff;
  --border: #d8e2dc;
  --text: #17211c;
  --text-muted: #5c6f66;
  --accent: #0d9155;
  --grid-line: rgba(23, 33, 28, 0.05);
}

.dark {
  color-scheme: dark;
  --bg: #0b0f14;
  --surface: #10161d;
  --border: #223140;
  --text: #d7e2e9;
  --text-muted: #7d93a5;
  --accent: #46e08a;
  --grid-line: rgba(120, 150, 170, 0.05);
}

@theme inline {
  --color-canvas: var(--bg);
  --color-surface: var(--surface);
  --color-edge: var(--border);
  --color-fg: var(--text);
  --color-fg-muted: var(--text-muted);
  --color-phosphor: var(--accent);
  --font-mono: var(--font-jetbrains-mono), ui-monospace, 'SFMono-Regular', monospace;
  --font-sans: var(--font-inter), system-ui, sans-serif;
}

@utility bg-blueprint {
  background-image: linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size: 28px 28px;
}

body {
  background-color: var(--bg);
  color: var(--text);
}

*:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

- [ ] **Step 6: Wire fonts and provider into `src/app/layout.tsx`** (replace file)

```tsx
import type { Metadata, Viewport } from 'next';

import { Inter, JetBrains_Mono } from 'next/font/google';

import { ThemeProvider } from '@/components/site/theme-provider';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'Michaux Kelley — Full-Stack AI Forward Deployed Engineer',
  description:
    'Production React, Next.js, and Node.js engineering — and AI-assisted development, deployed forward into teams.',
};

export const viewport: Viewport = {
  themeColor: [
    { color: '#0b0f14', media: '(prefers-color-scheme: dark)' },
    { color: '#f4f7f5', media: '(prefers-color-scheme: light)' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS (4 tests across 2 files).

- [ ] **Step 8: Visual smoke check**

`pnpm dev`, open http://localhost:3000 — page background should be warm off-white (light fallback in jsdom-less real browsers follows the OS). No console errors. Ctrl-C.

- [ ] **Step 9: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/components/ package.json pnpm-lock.yaml
git commit -m "feat: add Phosphor theme tokens, self-hosted fonts, and theme toggle"
```

---

### Task 5: Site config and nav

**Files:**
- Create: `src/lib/site-config.ts`
- Create: `src/components/site/site-nav.tsx`
- Test: `src/components/site/site-nav.test.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `ThemeToggle` from Task 4.
- Produces: `siteConfig: SiteConfig` — fields `name`, `handle`, `title`, `tagline`, `description`, `url`, `repoUrl: string | null`, `socials: { bluesky: string | null; github: string; linkedin: string }` (Tasks 6–8 and later phases read these); `SiteNav` component (no props).

- [ ] **Step 1: Create `src/lib/site-config.ts`**

```typescript
export interface SiteConfig {
  description: string;
  handle: string;
  name: string;
  /** Public repo for the "open source on GitHub" links — owner supplies later. */
  repoUrl: string | null;
  socials: {
    /** Owner supplies later; footer hides the link while null. */
    bluesky: string | null;
    github: string;
    linkedin: string;
  };
  tagline: string;
  title: string;
  url: string;
}

export const siteConfig: SiteConfig = {
  description:
    'Production React, Next.js, and Node.js engineering — and AI-assisted development, deployed forward into teams.',
  handle: 'mkelley33',
  name: 'Michaux Kelley',
  repoUrl: null,
  socials: {
    bluesky: null,
    github: 'https://github.com/mkelley33',
    linkedin: 'https://www.linkedin.com/in/mkelley33',
  },
  tagline: 'Full-stack engineering, AI at the terminal.',
  title: 'Michaux Kelley — Full-Stack AI Forward Deployed Engineer',
  url: 'https://mkelley33.com',
};
```

- [ ] **Step 2: Write the failing SiteNav test**

Create `src/components/site/site-nav.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { SiteNav } from '@/components/site/site-nav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('SiteNav', () => {
  it('renders the logo linking home', () => {
    render(<SiteNav />);
    expect(screen.getByRole('link', { name: '~/mkelley33' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it.each([
    ['./home', '/'],
    ['./blog', '/blog'],
    ['./services', '/services'],
    ['./cv', '/cv'],
    ['./contact', '/contact'],
  ])('renders %s linking to %s', (label, href) => {
    render(<SiteNav />);
    expect(screen.getByRole('link', { name: label })).toHaveAttribute(
      'href',
      href,
    );
  });

  it('marks the current route with aria-current', () => {
    render(<SiteNav />);
    expect(screen.getByRole('link', { name: './home' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: './blog' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `@/components/site/site-nav`.

- [ ] **Step 4: Implement `src/components/site/site-nav.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ThemeToggle } from '@/components/site/theme-toggle';

const NAV_LINKS = [
  { href: '/', label: './home' },
  { href: '/blog', label: './blog' },
  { href: '/services', label: './services' },
  { href: '/cv', label: './cv' },
  { href: '/contact', label: './contact' },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-edge">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 font-mono text-sm"
      >
        <Link className="font-bold text-phosphor" href="/">
          ~/mkelley33
        </Link>
        <ul className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                aria-current={isActive(pathname, link.href) ? 'page' : undefined}
                className="text-fg-muted transition-colors hover:text-fg aria-[current=page]:text-fg"
                href={link.href}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li aria-hidden="true" className="hidden sm:block">
            <kbd className="rounded border border-edge px-1.5 py-0.5 text-xs text-fg-muted">
              ⌘K
            </kbd>
          </li>
          <li>
            <ThemeToggle />
          </li>
        </ul>
      </nav>
    </header>
  );
}
```

(The `⌘K` kbd is a visual hint only; the palette itself ships in Phase 5.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Mount nav in `src/app/layout.tsx`**

Replace the `<ThemeProvider>{children}</ThemeProvider>` line with:

```tsx
        <ThemeProvider>
          <div className="flex min-h-dvh flex-col">
            <SiteNav />
            <main className="flex-1">{children}</main>
          </div>
        </ThemeProvider>
```

and add the import (sorted):

```tsx
import { SiteNav } from '@/components/site/site-nav';
```

- [ ] **Step 7: Lint, test, build**

```bash
pnpm lint && pnpm test && pnpm build
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/ src/components/site/site-nav.tsx src/components/site/site-nav.test.tsx src/app/layout.tsx
git commit -m "feat: add site config and terminal nav with active-route state"
```

---

### Task 6: Site footer

**Files:**
- Create: `src/components/site/site-footer.tsx`
- Test: `src/components/site/site-footer.test.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `siteConfig` from Task 5.
- Produces: `SiteFooter` component (no props). Null-valued links (`bluesky`, `repoUrl`) are hidden until the owner supplies URLs — flipping the config value is the only change needed later.

- [ ] **Step 1: Write the failing SiteFooter test**

Create `src/components/site/site-footer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { SiteFooter } from '@/components/site/site-footer';
import { siteConfig } from '@/lib/site-config';

describe('SiteFooter', () => {
  it('renders the copyleft line with the current year', () => {
    render(<SiteFooter />);
    const year = new Date().getFullYear().toString();
    expect(
      screen.getByText(new RegExp(`${year} michaux kelley — copyleft`)),
    ).toBeInTheDocument();
  });

  it('renders github and linkedin links', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'github' })).toHaveAttribute(
      'href',
      siteConfig.socials.github,
    );
    expect(screen.getByRole('link', { name: 'linkedin' })).toHaveAttribute(
      'href',
      siteConfig.socials.linkedin,
    );
  });

  it('hides links whose URLs are not yet supplied', () => {
    render(<SiteFooter />);
    expect(
      screen.queryByRole('link', { name: 'bluesky' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'source' }),
    ).not.toBeInTheDocument();
  });
});
```

Note: the third test asserts current config state (`bluesky`/`repoUrl` null). When the owner supplies URLs, update this test to assert the links render — that is the intended contract.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `@/components/site/site-footer`.

- [ ] **Step 3: Implement `src/components/site/site-footer.tsx`**

```tsx
import { siteConfig } from '@/lib/site-config';

interface FooterLink {
  href: string;
  label: string;
}

function externalLinks(): FooterLink[] {
  const candidates: { href: string | null; label: string }[] = [
    { href: siteConfig.socials.github, label: 'github' },
    { href: siteConfig.socials.linkedin, label: 'linkedin' },
    { href: siteConfig.socials.bluesky, label: 'bluesky' },
    { href: siteConfig.repoUrl, label: 'source' },
  ];
  return candidates.filter(
    (candidate): candidate is FooterLink => candidate.href !== null,
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-edge">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-6 font-mono text-xs text-fg-muted">
        <p>
          🄯 {new Date().getFullYear()} michaux kelley — copyleft, share alike
        </p>
        <ul className="ml-auto flex flex-wrap gap-x-4">
          {externalLinks().map((link) => (
            <li key={link.label}>
              <a
                className="transition-colors hover:text-fg"
                href={link.href}
                rel="me noopener noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
```

(`/uses` and RSS footer links arrive with their routes in Phases 2–3.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Mount footer in `src/app/layout.tsx`**

Inside the `min-h-dvh` div, after `</main>`, add `<SiteFooter />`, with sorted import:

```tsx
import { SiteFooter } from '@/components/site/site-footer';
```

- [ ] **Step 6: Lint and test**

```bash
pnpm lint && pnpm test
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/site/site-footer.tsx src/components/site/site-footer.test.tsx src/app/layout.tsx
git commit -m "feat: add footer with copyleft line and null-safe social links"
```

---

### Task 7: Placeholder home hero

**Files:**
- Create: `src/components/home/hero.tsx`
- Test: `src/components/home/hero.test.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `siteConfig` from Task 5; `bg-blueprint` utility from Task 4.
- Produces: `Hero` component (no props). Phase 3 replaces its static `$ whoami` line with the typewriter version — the section structure and CTAs stay.

- [ ] **Step 1: Write the failing Hero test**

Create `src/components/home/hero.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { Hero } from '@/components/home/hero';

describe('Hero', () => {
  it('renders the whoami prompt and name', () => {
    render(<Hero />);
    expect(screen.getByText('$ whoami')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Michaux Kelley' }),
    ).toBeInTheDocument();
  });

  it('renders both CTAs', () => {
    render(<Hero />);
    expect(
      screen.getByRole('link', { name: /read the blog/i }),
    ).toHaveAttribute('href', '/blog');
    expect(screen.getByRole('link', { name: /work with me/i })).toHaveAttribute(
      'href',
      '/contact',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `@/components/home/hero`.

- [ ] **Step 3: Implement `src/components/home/hero.tsx`**

```tsx
import Link from 'next/link';

import { siteConfig } from '@/lib/site-config';

export function Hero() {
  return (
    <section className="bg-blueprint">
      <div className="mx-auto w-full max-w-5xl px-5 py-20 sm:py-28">
        <p className="font-mono text-sm text-phosphor">$ whoami</p>
        <h1 className="mt-4 font-mono text-4xl font-bold tracking-tight sm:text-5xl">
          {siteConfig.name}
        </h1>
        <p className="mt-3 font-mono text-lg text-phosphor">
          {siteConfig.tagline}
        </p>
        <p className="mt-5 max-w-xl leading-relaxed text-fg-muted">
          # 10+ years of production React, Next.js &amp; Node — deployed forward
          with Claude Code, MCP &amp; friends
        </p>
        <div className="mt-8 flex flex-wrap gap-4 font-mono text-sm">
          <Link
            className="rounded border border-phosphor px-4 py-2 text-phosphor transition-colors hover:bg-phosphor hover:text-canvas"
            href="/blog"
          >
            Read the blog →
          </Link>
          <Link
            className="rounded border border-edge px-4 py-2 text-fg-muted transition-colors hover:text-fg"
            href="/contact"
          >
            Work with me
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Replace `src/app/page.tsx`**

```tsx
import { Hero } from '@/components/home/hero';

export default function HomePage() {
  return <Hero />;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/home/ src/app/page.tsx
git commit -m "feat: add placeholder terminal hero on home page"
```

---

### Task 8: Terminal 404 page and metadata polish

**Files:**
- Create: `src/app/not-found.tsx`
- Test: `src/app/not-found.test.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `siteConfig` from Task 5.
- Produces: site-wide title template (`%s · mkelley33`) and `metadataBase`; 404 route in the spec's terminal voice.

- [ ] **Step 1: Write the failing 404 test**

Create `src/app/not-found.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import NotFound from '@/app/not-found';

describe('NotFound', () => {
  it('renders the command-not-found heading', () => {
    render(<NotFound />);
    expect(
      screen.getByRole('heading', { level: 1, name: /command not found/i }),
    ).toBeInTheDocument();
  });

  it('offers a way home', () => {
    render(<NotFound />);
    expect(screen.getByRole('link', { name: 'cd ~' })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `@/app/not-found`.

- [ ] **Step 3: Implement `src/app/not-found.tsx`**

```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-20 font-mono sm:py-28">
      <p className="text-sm text-fg-muted">$ open requested-page</p>
      <h1 className="mt-4 text-2xl font-bold">
        zsh: command not found <span className="text-phosphor">(404)</span>
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
        The page you were looking for doesn&apos;t exist — it may have been
        moved, renamed, or never committed.
      </p>
      <p className="mt-8 text-sm">
        <Link
          className="text-phosphor underline underline-offset-4"
          href="/"
        >
          cd ~
        </Link>
      </p>
    </section>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Upgrade metadata in `src/app/layout.tsx`**

Replace the `metadata` export with:

```tsx
export const metadata: Metadata = {
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: '%s · mkelley33',
  },
};
```

and add the sorted import:

```tsx
import { siteConfig } from '@/lib/site-config';
```

- [ ] **Step 6: Lint, test, build**

```bash
pnpm lint && pnpm test && pnpm build
```

Expected: all pass; build lists `/` and `/_not-found`.

- [ ] **Step 7: Commit**

```bash
git add src/app/not-found.tsx src/app/not-found.test.tsx src/app/layout.tsx
git commit -m "feat: add terminal 404 page and metadata title template"
```

---

### Task 9: Continuous integration

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `lint`, `test`, `build` scripts from earlier tasks.
- Produces: CI gate that later phases extend (coverage, Playwright).

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

- [ ] **Step 2: Verify the same gate passes locally**

```bash
pnpm install --frozen-lockfile && pnpm lint && pnpm test && pnpm build
```

Expected: all pass (this is exactly what CI will run; the workflow itself executes on the first push once a GitHub remote exists).

- [ ] **Step 3: Run the coverage gate once to confirm thresholds hold**

```bash
pnpm test:coverage
```

Expected: PASS with all four metrics ≥ 90% for `src/components/**` and `src/lib/**`. If a metric falls short, add the missing component test rather than lowering thresholds.

- [ ] **Step 4: Commit**

```bash
git add .github/
git commit -m "chore: add CI workflow running lint, tests, and build"
```
