# Phase 3: Pages (Home Narrative Scroll, Services, CV, Uses) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the home page narrative scroll (about, AI toolbox, services, career log, open source, latest posts), the services page backed by a seeded Payload collection, the CV page mirroring the resume with a print stylesheet, and the /uses page — plus the platform hygiene items deferred to Phase 3.

**Architecture:** Static-first Server Components composed from small tested beat components. Services live in a new Payload `services` collection seeded from a shared content module that doubles as the empty-DB fallback (CI builds against an empty in-memory Mongo). CV and career-log content share one module. All terminal-voice section headings go through one `TerminalSection` component.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4 tokens, Payload 3 (mongooseAdapter), Vitest + RTL, mongodb-memory-server harness.

## Global Constraints

- TypeScript strict; no `any`. Named exports only, EXCEPT Next.js convention files (`page.tsx` default-exports the page; route segment config / `metadata` / `generateMetadata` exports allowed; `sitemap.ts` default-exports).
- Design tokens only in components — utilities `bg-canvas`, `bg-surface`, `border-edge`, `text-fg`, `text-fg-muted`, `text-phosphor`, `border-phosphor`, `font-mono`, `font-sans`, `bg-blueprint`. No raw hex.
- Version pins must not drift: typescript 5.9.3, eslint ^9, tsx 4.22.4, Next.js 16.2.11, Payload 3.86.x, sharp per Payload peer range, graphql ^16.
- Coverage gate: `pnpm test:coverage` enforces 90% (all metrics) over `src/components/**` and `src/lib/**`. Every new component and lib module in those globs needs meaningful tests. App-router files (`src/app/**`) are outside the coverage globs — keep pages thin, put logic in components/lib.
- Env names exactly `DATABASE_URL`, `PAYLOAD_SECRET`, `BLOB_READ_WRITE_TOKEN`; never commit real values.
- Lint runs `perfectionist` (sorted imports, object keys) and `jsx-a11y`. Run `pnpm lint` before every commit; `eslint --fix` reordering is expected, not a deviation.
- Adding a collection requires regenerating types with `pnpm generate:types` (runs `scripts/generate-types.mjs` via the tsx CLI — the upstream `payload` CLI is broken on Node 24, payloadcms/payload#16378). Commit the regenerated `src/payload-types.ts`.
- Every commit message ends with these two trailer lines exactly:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01VWHYP1WscXnehjiTacQrCA`

**Deliberately deferred (do NOT build in this phase):** the `$ subscribe --newsletter` home beat (Phase 4 — needs Server Action + Turnstile); contact page (Phase 4); Motion scroll reveals, hero typewriter, ⌘K palette, OG images, PWA (Phase 5); shadcn/ui install (Phase 4, first needed for the contact Dialog). The home page ships its beats static in this phase; Phase 5 adds motion.

**Owner-supplied items still pending (design spec §10):** headshot image, resume PDF export, Bluesky URL. This plan gates each behind a nullable `siteConfig` field so the owner can flip them on without code changes beyond the config value. The `/uses` hardware section ships with minimal safe copy — owner may expand it post-merge (content-only edit).

---

### Task 1: Platform hygiene — siteConfig fields, repository cache(), RSS hardening

**Files:**
- Modify: `src/lib/site-config.ts`
- Modify: `src/lib/repositories/posts.ts`
- Modify: `src/lib/rss.ts`
- Test: `src/lib/rss.test.ts`, `src/components/site/site-footer.test.tsx`

**Interfaces:**
- Consumes: existing `siteConfig`, `escapeXml`, `buildRssXml`.
- Produces: `siteConfig.repoUrl: 'https://github.com/braveneworg/mkelley33'`; new fields `siteConfig.headshot: string | null` (null) and `siteConfig.resumePdf: string | null` (null); `listPublishedPosts`/`getPostBySlug` wrapped in React `cache()` (same signatures); RSS with `xmlns:atom`, `<atom:link rel="self">`, and escaped item URLs. Tasks 4, 5, 7 read the new siteConfig fields.

- [ ] **Step 1: Update `src/lib/site-config.ts`**

Add two fields to the interface (alphabetical position) and set `repoUrl`:

```typescript
export interface SiteConfig {
  description: string;
  handle: string;
  /** Path under /public to the headshot image; null until the owner supplies it. */
  headshot: string | null;
  name: string;
  /** Public repo for the "open source on GitHub" links — owner supplies later. */
  repoUrl: string | null;
  /** Path under /public to the resume PDF; null until the owner supplies it. */
  resumePdf: string | null;
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
  headshot: null,
  name: 'Michaux Kelley',
  repoUrl: 'https://github.com/braveneworg/mkelley33',
  resumePdf: null,
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

- [ ] **Step 2: Write the failing footer test (source link now appears)**

Add to `src/components/site/site-footer.test.tsx`:

```tsx
  it('links the repo source now that repoUrl is set', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'source' })).toHaveAttribute(
      'href',
      'https://github.com/braveneworg/mkelley33',
    );
  });
```

Run: `pnpm exec vitest run src/components/site/site-footer.test.tsx`
Expected: PASS immediately if Step 1 landed first (the footer already renders `repoUrl` when non-null) — this test pins the new behavior. If it fails, Step 1 was transcribed wrong.

- [ ] **Step 3: Wrap the posts repository in React `cache()`**

Replace `src/lib/repositories/posts.ts` contents with:

```typescript
import config from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

import type { Post } from '@/payload-types';

async function client() {
  return getPayload({ config });
}

export const listPublishedPosts = cache(async (): Promise<Post[]> => {
  const payload = await client();
  const result = await payload.find({
    collection: 'posts',
    limit: 100,
    overrideAccess: false,
    sort: '-publishedAt',
    where: { status: { equals: 'published' } },
  });
  return result.docs;
});

export const getPostBySlug = cache(
  async (slug: string): Promise<Post | null> => {
    const payload = await client();
    const result = await payload.find({
      collection: 'posts',
      limit: 1,
      overrideAccess: false,
      where: {
        and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
      },
    });
    return result.docs[0] ?? null;
  },
);
```

Signatures are unchanged; `cache()` deduplicates repeat calls within one request (the post page calls `listPublishedPosts` in both `generateStaticParams` and the page body).

Run: `pnpm exec vitest run src/lib/repositories/posts.int.test.ts`
Expected: PASS (slow — boots memory Mongo). React 19 exports `cache` in all conditions; if the node test env ever rejects the import, report BLOCKED with the exact error — do not shim it.

- [ ] **Step 4: Write the failing RSS hardening tests**

In `src/lib/rss.test.ts`, update the first assertion and add two tests:

Replace `expect(xml).toContain('<rss version="2.0">');` with:

```typescript
    expect(xml).toContain(
      '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    );
```

Add inside the describe block:

```typescript
  it('declares itself via atom:link rel=self', () => {
    const xml = buildRssXml([]);
    expect(xml).toContain(
      '<atom:link href="https://mkelley33.com/feed.xml" rel="self" type="application/rss+xml" />',
    );
  });

  it('escapes ampersands in item link and guid', () => {
    const xml = buildRssXml([makePost({ slug: 'a&b' })]);
    expect(xml).toContain('<link>https://mkelley33.com/blog/a&amp;b</link>');
    expect(xml).toContain('<guid>https://mkelley33.com/blog/a&amp;b</guid>');
    expect(xml).not.toContain('/blog/a&b<');
  });
```

Run: `pnpm exec vitest run src/lib/rss.test.ts`
Expected: FAIL (old `<rss>` tag, no atom:link, unescaped URLs).

- [ ] **Step 5: Implement the RSS changes**

In `src/lib/rss.ts`:

1. In the item builder, escape the URL: replace the two lines using `${url}` with

```typescript
        `      <link>${escapeXml(url)}</link>`,
        `      <guid>${escapeXml(url)}</guid>`,
```

2. In the channel array, replace `'<rss version="2.0">',` with

```typescript
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
```

3. After the `<language>en</language>` line add:

```typescript
    `    <atom:link href="${siteConfig.url}/feed.xml" rel="self" type="application/rss+xml" />`,
```

Run: `pnpm exec vitest run src/lib/rss.test.ts`
Expected: PASS.

- [ ] **Step 6: Full gate and commit**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run src/lib/rss.test.ts src/components/site/site-footer.test.tsx src/lib/repositories/posts.int.test.ts
git add src/lib/site-config.ts src/lib/repositories/posts.ts src/lib/rss.ts src/lib/rss.test.ts src/components/site/site-footer.test.tsx
git commit -m "chore: set repo url, cache repositories, harden rss feed"
```

---

### Task 2: Services content, collection, seed, and repository

**Files:**
- Create: `src/lib/services-content.ts`, `src/collections/services.ts`, `src/lib/services-seed.ts`, `scripts/seed-services.ts`, `src/lib/repositories/services.ts`
- Modify: `src/payload.config.ts`, `package.json` (one script line), `src/payload-types.ts` (regenerated)
- Test: `src/lib/repositories/services.int.test.ts`

**Interfaces:**
- Consumes: `createTestPayload` from `src/test/payload-harness.ts`; the migrate-posts CLI pattern (`tsx --env-file-if-exists=.env.local`).
- Produces: `interface ServiceContent { credibility: string; deliverables: string[]; name: string; pitch: string; slug: string }`; `SERVICES: ServiceContent[]` (5 entries, canonical order); `seedServices(payload: Payload): Promise<{ created: string[]; updated: string[] }>`; `listServices(): Promise<ServiceContent[]>` (DB-backed, falls back to `SERVICES` when the collection is empty or unreachable). Tasks 3 and 5 consume `SERVICES`/`listServices`; Phase 4's contact modal will consume the collection.

- [ ] **Step 1: Create `src/lib/services-content.ts`**

```typescript
export interface ServiceContent {
  credibility: string;
  deliverables: string[];
  name: string;
  pitch: string;
  slug: string;
}

/** Canonical service list: seed source and empty-DB fallback. Order matters. */
export const SERVICES: ServiceContent[] = [
  {
    credibility:
      'Early participant in the Windsurf/Cascade pilot that drove company-wide adoption at Centene; presented Copilot, prompt engineering, and MCP servers to hundreds of developers and leadership.',
    deliverables: [
      'Tooling pilots and rollout: Claude Code, GitHub Copilot, Windsurf',
      'MCP server integration wired to your actual systems (docs, design, data)',
      'Prompt & context engineering playbooks for your codebase',
      'Hands-on workshops and pairing sessions',
      'An adoption report with metrics your leadership can read',
    ],
    name: 'AI engineering enablement',
    pitch:
      'Your team has Copilot licenses and a mandate. Turning that into shipped software is the hard part. I run the adoption end-to-end: tool selection and pilots, MCP server integration, prompt and context engineering, and the training that makes it stick.',
    slug: 'ai-enablement',
  },
  {
    credibility:
      'Founding engineer of Boudreaux, an MPL 2.0 open-source music marketplace; senior engineer on healthcare platforms serving multiple lines of business at Centene.',
    deliverables: [
      'Greenfield product builds, from architecture to deploy',
      'Marketplace and payment flows (Stripe & Stripe Connect)',
      'AWS infrastructure: EC2, S3, CloudFront, Lambda, SES',
      'CI/CD pipelines with disciplined testing baked in',
      'Documentation and handoff your team can run with',
    ],
    name: 'Full-stack product development',
    pitch:
      'End-to-end builds in the stack I ship daily: React 19, Next.js App Router, TypeScript, Node.js, MongoDB, and AWS. From greenfield to launch — including payments, media delivery, and the unglamorous infrastructure in between.',
    slug: 'product-dev',
  },
  {
    credibility:
      "Brought custom React components across Centene's lines of business to WCAG 2.1 Level AA, verified with macOS VoiceOver and Lighthouse.",
    deliverables: [
      'Full WCAG 2.1 AA audit with prioritized findings',
      'Remediation in your components and design system',
      'VoiceOver and Lighthouse verification passes',
      'Accessible patterns documented for your team',
      'Regression guardrails in CI',
    ],
    name: 'Accessibility audits & fixes',
    pitch:
      'WCAG 2.1 AA is a legal floor and a usability win — and most React codebases fail it in the same dozen ways. I audit, fix, and verify with real assistive technology, then teach your team the patterns so it stays fixed.',
    slug: 'accessibility',
  },
  {
    credibility:
      'Raised coverage from ~60% to 90–95% across all metrics at Centene; 6,000+ Vitest tests running in under 12 seconds on Boudreaux.',
    deliverables: [
      'Lighthouse and runtime performance audits with fixes',
      'Test-coverage rescue: Vitest, React Testing Library, Playwright',
      'CI pipeline hygiene: caching, pre-commit hooks, flake hunting',
      'Coverage gates that hold (90%+ across metrics)',
      'A performance budget your team can enforce',
    ],
    name: 'Performance & testing uplift',
    pitch:
      'Slow pages and flaky suites compound daily. I profile, fix, and leave behind fast builds, honest coverage, and CI that catches regressions before your users do.',
    slug: 'performance',
  },
  {
    credibility:
      'Mentored and paired with junior engineers on React, TypeScript, Next.js, and responsible AI tooling across multiple enterprise teams.',
    deliverables: [
      'Recurring 1:1 pairing and mentoring sessions',
      'Code review standards and culture that outlast me',
      'AI-assisted development mentorship for juniors and seniors',
      'Interview and career-growth guidance',
      'A mentoring cadence report for engineering leadership',
    ],
    name: 'Team mentoring',
    pitch:
      'Leveling up engineers is the highest-leverage work I do. Pairing, code review culture, and honest feedback — including how to use AI tooling responsibly instead of leaning on it.',
    slug: 'mentoring',
  },
];
```

- [ ] **Step 2: Create `src/collections/services.ts`**

```typescript
import type { CollectionConfig } from 'payload';

export const Services: CollectionConfig = {
  access: {
    read: () => true,
  },
  admin: {
    defaultColumns: ['name', 'slug', 'order'],
    useAsTitle: 'name',
  },
  fields: [
    { name: 'name', required: true, type: 'text' },
    { index: true, name: 'slug', required: true, type: 'text', unique: true },
    { name: 'pitch', required: true, type: 'textarea' },
    { hasMany: true, name: 'deliverables', required: true, type: 'text' },
    { name: 'credibility', required: true, type: 'text' },
    { name: 'order', required: true, type: 'number' },
  ],
  slug: 'services',
};
```

- [ ] **Step 3: Register the collection and regenerate types**

In `src/payload.config.ts`, import `Services` (sorted with the other collection imports) and add it to the `collections` array after `Posts`:

```typescript
import { Services } from '@/collections/services';
// …
  collections: [Users, Media, Posts, Services],
```

(Match the file's existing import style and array order — `Services` goes last.)

Run: `pnpm generate:types`
Expected: `src/payload-types.ts` gains a `Service` interface (with `deliverables: string[]`, nullable variants per generator defaults) and the config map entry. Commit the regenerated file in Step 8.

- [ ] **Step 4: Create `src/lib/services-seed.ts`**

```typescript
import type { Payload } from 'payload';

import { SERVICES } from '@/lib/services-content';

/** Idempotent upsert of the canonical services list, keyed by slug. */
export async function seedServices(
  payload: Payload,
): Promise<{ created: string[]; updated: string[] }> {
  const created: string[] = [];
  const updated: string[] = [];
  for (const [index, service] of SERVICES.entries()) {
    const data = {
      credibility: service.credibility,
      deliverables: service.deliverables,
      name: service.name,
      order: index,
      pitch: service.pitch,
      slug: service.slug,
    };
    const existing = await payload.find({
      collection: 'services',
      limit: 1,
      where: { slug: { equals: service.slug } },
    });
    const doc = existing.docs[0];
    if (doc) {
      await payload.update({ collection: 'services', data, id: doc.id });
      updated.push(service.slug);
    } else {
      await payload.create({ collection: 'services', data });
      created.push(service.slug);
    }
  }
  return { created, updated };
}
```

- [ ] **Step 5: Create `src/lib/repositories/services.ts`**

```typescript
import config from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

import type { ServiceContent } from '@/lib/services-content';

import { SERVICES } from '@/lib/services-content';

export const listServices = cache(async (): Promise<ServiceContent[]> => {
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: 'services',
      limit: 20,
      overrideAccess: false,
      sort: 'order',
    });
    if (result.docs.length === 0) {
      return SERVICES;
    }
    return result.docs.map((doc) => ({
      credibility: doc.credibility,
      deliverables: doc.deliverables ?? [],
      name: doc.name,
      pitch: doc.pitch,
      slug: doc.slug,
    }));
  } catch {
    // DB unreachable (e.g. CI build) — serve the canonical static list.
    return SERVICES;
  }
});
```

(If the generated `Service` type marks `deliverables` non-nullable, drop the `?? []` — match the generated type, note it in your report.)

- [ ] **Step 6: Write the failing integration test**

Create `src/lib/repositories/services.int.test.ts`:

```typescript
// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Payload } from 'payload';

import { SERVICES } from '@/lib/services-content';
import { seedServices } from '@/lib/services-seed';
import { createTestPayload } from '@/test/payload-harness';

let payload: Payload;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ payload, teardown } = await createTestPayload());
}, 120_000);

afterAll(async () => {
  await teardown();
});

describe('services seed + repository', () => {
  it('falls back to canonical content while the collection is empty', async () => {
    const { listServices } = await import('@/lib/repositories/services');
    const services = await listServices();
    expect(services).toEqual(SERVICES);
  });

  it('seeds all five services and is idempotent', async () => {
    const first = await seedServices(payload);
    expect(first.created).toHaveLength(5);
    expect(first.updated).toHaveLength(0);
    const second = await seedServices(payload);
    expect(second.created).toHaveLength(0);
    expect(second.updated).toHaveLength(5);
    const found = await payload.find({ collection: 'services', sort: 'order' });
    expect(found.docs.map((doc) => doc.slug)).toEqual(
      SERVICES.map((service) => service.slug),
    );
  });
});
```

Note: the fallback test must run BEFORE the seed test (declaration order above) — it relies on the empty collection. `listServices` uses React `cache()`, which memoizes per server request; in the test process each direct call re-executes, so ordering is the only constraint. If you observe the first test's result being served to the second (cache leakage across calls in the vitest process), report BLOCKED with the evidence — do not reorder assertions to mask it.

Run: `pnpm exec vitest run src/lib/repositories/services.int.test.ts`
Expected: FAIL (modules don't exist yet) → then PASS once Steps 1–5 land.

- [ ] **Step 7: Create the CLI wrapper and package script**

Create `scripts/seed-services.ts`:

```typescript
import config from '@payload-config';
import { getPayload } from 'payload';

import { seedServices } from '@/lib/services-seed';

async function run(): Promise<void> {
  const payload = await getPayload({ config });
  const result = await seedServices(payload);
  console.log(
    `seed:services done — created: [${result.created.join(', ')}], updated: [${result.updated.join(', ')}]`,
  );
  process.exit(0);
}

run().catch((error: unknown) => {
  console.error(`seed:services failed — ${String(error)}`);
  process.exit(1);
});
```

In `package.json` scripts (next to `migrate:posts`):

```json
    "seed:services": "tsx --env-file-if-exists=.env.local scripts/seed-services.ts",
```

Smoke-test the wiring fails at the connection step, not module load:

```bash
DATABASE_URL="mongodb://127.0.0.1:9/db" PAYLOAD_SECRET=x pnpm seed:services
```

Expected: `seed:services failed — …ECONNREFUSED…`, exit code 1, no `Cannot find module` anywhere.

- [ ] **Step 8: Full gate and commit**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run src/lib/repositories/services.int.test.ts
git add src/lib/services-content.ts src/collections/services.ts src/lib/services-seed.ts src/lib/repositories/services.ts src/lib/repositories/services.int.test.ts scripts/seed-services.ts src/payload.config.ts src/payload-types.ts package.json
git commit -m "feat: add services collection with canonical content, seed, and repository"
```

---

### Task 3: Services page

**Files:**
- Create: `src/app/(site)/services/page.tsx`, `src/components/services/service-section.tsx`
- Test: `src/components/services/service-section.test.tsx`

**Interfaces:**
- Consumes: `listServices` and `ServiceContent` from Task 2.
- Produces: `/services` route with one anchor section per service (`id={slug}`); `ServiceSection` component (props `{ service: ServiceContent }`). Home services beat (Task 5) links to `/services#<slug>`.

- [ ] **Step 1: Write the failing ServiceSection test**

Create `src/components/services/service-section.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { ServiceSection } from '@/components/services/service-section';
import { SERVICES } from '@/lib/services-content';

const service = SERVICES[0];

describe('ServiceSection', () => {
  it('anchors on the slug and renders name, pitch, credibility', () => {
    const { container } = render(<ServiceSection service={service} />);
    expect(container.querySelector('#ai-enablement')).not.toBeNull();
    expect(
      screen.getByRole('heading', { name: /ai-enablement\// }),
    ).toBeInTheDocument();
    expect(screen.getByText(service.pitch)).toBeInTheDocument();
    expect(screen.getByText(service.credibility)).toBeInTheDocument();
  });

  it('lists every deliverable and links the quote CTA with the slug', () => {
    render(<ServiceSection service={service} />);
    for (const deliverable of service.deliverables) {
      expect(screen.getByText(deliverable)).toBeInTheDocument();
    }
    expect(
      screen.getByRole('link', { name: /request a quote/i }),
    ).toHaveAttribute('href', '/contact?reason=services&service=ai-enablement');
  });
});
```

Run: `pnpm exec vitest run src/components/services/service-section.test.tsx`
Expected: FAIL (component missing).

- [ ] **Step 2: Implement `src/components/services/service-section.tsx`**

```tsx
import Link from 'next/link';

import type { ServiceContent } from '@/lib/services-content';

export function ServiceSection({ service }: { service: ServiceContent }) {
  return (
    <section
      className="scroll-mt-24 border-t border-edge py-10 first:border-t-0"
      id={service.slug}
    >
      <h2 className="font-mono text-xl font-bold text-phosphor">
        {service.slug}/
      </h2>
      <p className="mt-1 font-mono text-sm text-fg">{service.name}</p>
      <p className="mt-4 max-w-2xl leading-relaxed text-fg-muted">
        {service.pitch}
      </p>
      <ul className="mt-4 max-w-2xl space-y-1 text-sm text-fg">
        {service.deliverables.map((deliverable) => (
          <li className="flex gap-2" key={deliverable}>
            <span aria-hidden="true" className="text-phosphor">
              ▸
            </span>
            <span>{deliverable}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 max-w-2xl font-mono text-xs text-fg-muted">
        # {service.credibility}
      </p>
      <Link
        className="mt-5 inline-block rounded border border-phosphor px-4 py-2 font-mono text-sm text-phosphor transition-colors hover:bg-phosphor hover:text-canvas"
        href={`/contact?reason=services&service=${service.slug}`}
      >
        Request a quote →
      </Link>
    </section>
  );
}
```

Run: `pnpm exec vitest run src/components/services/service-section.test.tsx`
Expected: PASS.

- [ ] **Step 3: Create `src/app/(site)/services/page.tsx`**

```tsx
import type { Metadata } from 'next';

import { ServiceSection } from '@/components/services/service-section';
import { listServices } from '@/lib/repositories/services';

export const revalidate = 300;

export const metadata: Metadata = {
  description:
    'AI engineering enablement, full-stack product development, accessibility, performance, and mentoring — request a quote.',
  title: 'services',
};

export default async function ServicesPage() {
  const services = await listServices();
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <p className="font-mono text-sm text-fg-muted">
        <span className="text-phosphor">$</span> ls ./services
      </p>
      <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight sm:text-4xl">
        # Services
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-fg-muted">
        Five ways I can help your team ship. Every engagement starts with a
        conversation — request a quote and tell me where it hurts.
      </p>
      <div className="mt-10">
        {services.map((service) => (
          <ServiceSection key={service.slug} service={service} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Full gate and commit**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run src/components/services/service-section.test.tsx && pnpm build:ci
git add src/components/services/ "src/app/(site)/services/"
git commit -m "feat: add services page with anchored sections and quote CTAs"
```

(`pnpm build:ci` proves the page renders through the empty-DB fallback path.)

---

### Task 4: Home beats — TerminalSection, about, AI toolbox

**Files:**
- Create: `src/components/home/terminal-section.tsx`, `src/components/home/about-beat.tsx`, `src/components/home/ai-toolbox-beat.tsx`
- Test: `src/components/home/terminal-section.test.tsx`, `src/components/home/about-beat.test.tsx`, `src/components/home/ai-toolbox-beat.test.tsx`

**Interfaces:**
- Consumes: `siteConfig.headshot` (Task 1).
- Produces: `TerminalSection` (props `{ children: React.ReactNode; command: string }`) — every later beat wraps in it; `AboutBeat` (props `{ headshotSrc?: string | null }`, defaulting to `siteConfig.headshot`); `AiToolboxBeat` (no props).

- [ ] **Step 1: Write the failing TerminalSection test**

Create `src/components/home/terminal-section.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { TerminalSection } from '@/components/home/terminal-section';

describe('TerminalSection', () => {
  it('renders the prompt command and children', () => {
    render(
      <TerminalSection command="cat ./about.md">
        <p>hello</p>
      </TerminalSection>,
    );
    expect(screen.getByText('cat ./about.md')).toBeInTheDocument();
    expect(screen.getByText('$')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
```

Run: `pnpm exec vitest run src/components/home/terminal-section.test.tsx` — Expected: FAIL.

- [ ] **Step 2: Implement `src/components/home/terminal-section.tsx`**

```tsx
export function TerminalSection({
  children,
  command,
}: {
  children: React.ReactNode;
  command: string;
}) {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-12 sm:py-16">
      <p className="font-mono text-sm text-fg-muted">
        <span className="text-phosphor">$</span> {command}
      </p>
      <div className="mt-6">{children}</div>
    </section>
  );
}
```

Run the test — Expected: PASS.

- [ ] **Step 3: Write the failing AboutBeat test**

Create `src/components/home/about-beat.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { AboutBeat } from '@/components/home/about-beat';

describe('AboutBeat', () => {
  it('renders the bio and interests line', () => {
    render(<AboutBeat headshotSrc={null} />);
    expect(screen.getByText('cat ./about.md')).toBeInTheDocument();
    expect(screen.getByText(/10\+ years shipping production React/)).toBeInTheDocument();
    expect(screen.getByText(/music, meditation/)).toBeInTheDocument();
  });

  it('renders a placeholder while the headshot is pending', () => {
    render(<AboutBeat headshotSrc={null} />);
    expect(screen.getByText('# headshot: pending')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders the headshot image when supplied', () => {
    render(<AboutBeat headshotSrc="/headshot.jpg" />);
    expect(
      screen.getByRole('img', { name: 'Michaux Kelley' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('# headshot: pending')).not.toBeInTheDocument();
  });
});
```

Run: FAIL (component missing).

- [ ] **Step 4: Implement `src/components/home/about-beat.tsx`**

```tsx
import Image from 'next/image';

import { TerminalSection } from '@/components/home/terminal-section';
import { siteConfig } from '@/lib/site-config';

export function AboutBeat({
  headshotSrc = siteConfig.headshot,
}: {
  headshotSrc?: string | null;
}) {
  return (
    <TerminalSection command="cat ./about.md">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
        <div className="shrink-0">
          {headshotSrc ? (
            <Image
              alt={siteConfig.name}
              className="rounded-full border border-edge"
              height={120}
              src={headshotSrc}
              width={120}
            />
          ) : (
            <div className="flex size-30 items-center justify-center rounded-full border border-dashed border-edge p-2 text-center font-mono text-xs text-fg-muted">
              # headshot: pending
            </div>
          )}
        </div>
        <div className="max-w-2xl space-y-4 leading-relaxed text-fg">
          <p>
            I&apos;m Michaux — a senior full-stack engineer with 10+ years
            shipping production React, Next.js, and Node.js for healthcare,
            security, retail, and marketplace platforms. I specialize in
            accessible, performant UI at scale, disciplined testing, and AWS
            cloud architecture.
          </p>
          <p>
            Lately I work forward-deployed: bringing AI-assisted development —
            Claude Code, Copilot, MCP servers, prompt and context engineering —
            into real teams and real codebases.
          </p>
          <p className="text-fg-muted">
            Away from the terminal: music, meditation, and a steady diet of
            non-fiction.
          </p>
        </div>
      </div>
    </TerminalSection>
  );
}
```

Run: PASS. (`size-30` is Tailwind 4's arbitrary spacing scale — if lint or build rejects it, use `h-[120px] w-[120px]` and note the adaptation.)

- [ ] **Step 5: Write the failing AiToolboxBeat test**

Create `src/components/home/ai-toolbox-beat.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { AiToolboxBeat } from '@/components/home/ai-toolbox-beat';

describe('AiToolboxBeat', () => {
  it('renders the intro line and key chips', () => {
    render(<AiToolboxBeat />);
    expect(screen.getByText('cat ./ai-toolbox')).toBeInTheDocument();
    expect(
      screen.getByText(/I don't just use AI tools — I deploy them into teams\./),
    ).toBeInTheDocument();
    for (const chip of [
      'Claude Code',
      'GitHub Copilot',
      'Windsurf / Cascade',
      'MCP: Context7',
      'prompt & context engineering',
      'skills: superpowers',
    ]) {
      expect(screen.getByText(chip)).toBeInTheDocument();
    }
  });
});
```

Run: FAIL.

- [ ] **Step 6: Implement `src/components/home/ai-toolbox-beat.tsx`**

```tsx
import { TerminalSection } from '@/components/home/terminal-section';

const CHIPS = [
  'Claude Code',
  'GitHub Copilot',
  'Windsurf / Cascade',
  'MCP: Context7',
  'MCP: SequentialThinking',
  'MCP: Figma',
  'MCP: Memory',
  'MCP: Markitdown',
  'MCP: chrome-devtools',
  'prompt & context engineering',
  'skills: superpowers',
  'skills: mattpocock',
];

export function AiToolboxBeat() {
  return (
    <TerminalSection command="cat ./ai-toolbox">
      <p className="max-w-2xl leading-relaxed text-fg">
        I don&apos;t just use AI tools — I deploy them into teams.
      </p>
      <ul className="mt-6 flex max-w-3xl flex-wrap gap-2">
        {CHIPS.map((chip) => (
          <li
            className="rounded border border-edge bg-surface px-3 py-1 font-mono text-xs text-fg-muted"
            key={chip}
          >
            {chip}
          </li>
        ))}
      </ul>
    </TerminalSection>
  );
}
```

Run: PASS.

- [ ] **Step 7: Full gate and commit**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run src/components/home/
git add src/components/home/terminal-section.tsx src/components/home/terminal-section.test.tsx src/components/home/about-beat.tsx src/components/home/about-beat.test.tsx src/components/home/ai-toolbox-beat.tsx src/components/home/ai-toolbox-beat.test.tsx
git commit -m "feat: add about and ai-toolbox home beats with terminal section"
```

---

### Task 5: CV content module + career, open-source, and services home beats

**Files:**
- Create: `src/lib/cv-content.ts`, `src/components/home/career-beat.tsx`, `src/components/home/open-source-beat.tsx`, `src/components/home/services-beat.tsx`
- Test: `src/components/home/career-beat.test.tsx`, `src/components/home/open-source-beat.test.tsx`, `src/components/home/services-beat.test.tsx`

**Interfaces:**
- Consumes: `TerminalSection` (Task 4), `SERVICES` (Task 2), `siteConfig.repoUrl` (Task 1).
- Produces: `interface CvExperience { bullets: string[]; end: string; hash: string; location: string; org: string; role: string; start: string }`; `CV_SUMMARY: string`; `CV_SKILLS: { items: string; label: string }[]`; `CV_EXPERIENCE: CvExperience[]`; `CV_EDUCATION: { detail: string; title: string }[]`; `CV_OPEN_SOURCE: string[]`. Task 7's CV page consumes all of these; `CareerBeat` consumes `CV_EXPERIENCE`.

- [ ] **Step 1: Create `src/lib/cv-content.ts`**

The resume is mirrored in full (phone number deliberately omitted from the public site). Content below is the approved resume text.

```typescript
export interface CvExperience {
  bullets: string[];
  end: string;
  hash: string;
  location: string;
  org: string;
  role: string;
  start: string;
}

export const CV_SUMMARY =
  'Senior full-stack software engineer with 10+ years building production React, Redux, Next.js, and TypeScript applications for enterprise healthcare, security, retail, and marketplace platforms. Specializes in performant, accessible (WCAG 2.1 AA) UI at scale, Node.js service design, AWS cloud architecture, and disciplined testing practices that routinely exceed 90% coverage. Actively integrates AI-assisted development workflows — GitHub Copilot, Claude Code, MCP servers, prompt and context engineering — to accelerate delivery, raise code quality, and mentor engineering teams.';

export const CV_SKILLS: { items: string; label: string }[] = [
  {
    items: 'TypeScript, JavaScript (ES2022+), HTML5, CSS3, Python, Bash',
    label: 'Languages',
  },
  {
    items:
      'React 19, Next.js (App Router, Server Actions), Tailwind CSS, shadcn/ui, Material UI, Redux Toolkit, Zustand, React Hook Form, Zod, Framer Motion, responsive design, accessibility (WCAG 2.1 AA)',
    label: 'Frontend',
  },
  {
    items:
      'Node.js, Next.js API routes, Server Actions, Express, Django, Auth.js v5, RESTful API design, OpenAPI/Swagger, Stripe & Stripe Connect, Prisma ORM, MongoDB Atlas',
    label: 'Backend',
  },
  {
    items:
      'AWS EC2, S3, CloudFront, Lambda, API Gateway, Route 53, SES, SAM; Docker; Vercel; CI/CD with GitHub Actions and Husky hooks',
    label: 'Cloud & infrastructure',
  },
  {
    items:
      'Vitest, Jest, React Testing Library, Playwright, Cypress, Storybook; integration and E2E test design; coverage and performance profiling',
    label: 'Testing',
  },
  {
    items:
      'Claude Code, GitHub Copilot, Windsurf/Cascade, custom skills (superpowers, mattpocock), MCP servers (Context7, SequentialThinking, Figma, Markitdown, Memory, chrome-devtools), prompt and context engineering, Spec-kit',
    label: 'AI-assisted development',
  },
];

export const CV_EXPERIENCE: CvExperience[] = [
  {
    bullets: [
      'Deliver responsive single-page applications and shared UI libraries in React 19, Zustand, Node.js 24, and Next.js supporting premium payments, claims retrieval, and claims historical data across multiple healthcare lines of business.',
      'Led a company-wide remediation for recent critical React, Next.js, and Node.js CVEs after escalating the vulnerabilities to leadership; coordinated migration of React 18 applications to current versions across Centene projects.',
      "Raised automated test coverage from ~60% to 90–95% across all metrics (exceeding Centene's 80% standard) by introducing Vitest, identifying long-running tests with AI-assisted analysis, and closing coverage gaps.",
      'Built AWS Lambda handlers in Backend-For-Frontend repositories for Node.js microservices; documented and designed APIs using the OpenAPI Specification and Swagger.',
      'Improved accessibility and localization across all lines of business to WCAG 2.1 Level AA in custom React components using the enterprise design system; verified with macOS VoiceOver and Google Lighthouse.',
      'Selected as an early participant in the Windsurf (Cascade + MCP) pilot that drove company-wide adoption; integrated SequentialThinking, Context7, Figma, Markitdown, Memory, and chrome-devtools MCP servers into planning, audit, and implementation workflows.',
      'Presented GitHub Copilot, prompt and context engineering, and MCP servers to hundreds of developers and leadership; authored knowledge-base articles on technical debt and AI-assisted engineering patterns.',
      'Standardized developer workflows by creating Git pre-commit and pre-push Husky hooks for owned projects, saving several developer-hours and hundreds of CI build minutes per week.',
      'Mentored and paired with junior engineers on React, TypeScript, Next.js, and responsible AI tooling usage.',
    ],
    end: 'present',
    hash: 'a7f3e21',
    location: 'Remote',
    org: 'TEKsystems at Centene Corporation',
    role: 'Senior Application Development Engineer (Contract)',
    start: '2025',
  },
  {
    bullets: [
      'Architect and build an MPL 2.0 open-source music marketplace platform (github.com/braveneworg/boudreaux, fakefourrecords.com) for an independent record label, supporting streaming music and video, downloads, purchases, and paid subscription tiers.',
      'Stack: Next.js App Router, React 19, TypeScript, Tailwind CSS, Prisma ORM, MongoDB Atlas, Auth.js v5, Stripe Connect (marketplace payouts), and AWS SES transactional email.',
      'Infrastructure: Dockerized Next.js on AWS EC2, with S3 and signed CloudFront URLs for audio delivery, Route 53 DNS, and AWS Lambda (SAM-deployed) handling Stripe webhook processing with idempotency and raw-body signature verification.',
      'Built a custom React audio player from scratch — transport controls, seekbar, playlist drawer, shuffle/repeat, keyboard shortcuts, Media Session API.',
      'Authored 6,000+ Vitest unit tests at 90%+ coverage across all metrics, executing in under 12 seconds; added Playwright end-to-end suites for critical purchase and playback flows.',
      'Share Zod schemas, TypeScript types, and Server Action contracts across front and back end; React Hook Form and Zod for all form validation.',
    ],
    end: 'present',
    hash: 'b9d4c88',
    location: 'Remote',
    org: 'Boudreaux / Fake Four Records — Brave New Org',
    role: 'Founding Engineer (Open-Source)',
    start: '2025',
  },
  {
    bullets: [
      "Scaffolded and architected the next generation of Limbik's flagship disinformation-mitigation application using Vite, MUI, Zustand, React Hook Form, and Zod.",
      'Delivered Next.js React components for filtering by demographic attributes and routing results through cognitive AI models to measure messaging resonance.',
      'Built organization and user settings components in TypeScript with Material UI; collaborated on secure, performant RESTful APIs with backend engineers.',
    ],
    end: '2025',
    hash: 'c2e8f19',
    location: 'Remote',
    org: 'Limbik',
    role: 'Senior React Developer',
    start: '2025',
  },
  {
    bullets: [
      'Developed responsive web applications in React, Redux, TypeScript, and Next.js — dashboards, reports, infographics, and sales tools.',
      'Designed and consumed RESTful APIs with backend engineers; secured PII with Web Crypto APIs; maintained an internal custom React component library.',
      'Managed application state with Redux Toolkit and Redux Persist; authored WCAG-compliant accessible components.',
      'Created a Next.js seed template adopted as the baseline for future company React projects.',
    ],
    end: '2024',
    hash: 'd5a1b37',
    location: 'Remote',
    org: 'TEKsystems at Ameritas',
    role: 'Senior React Developer (Contract)',
    start: '2023',
  },
  {
    bullets: [
      'Built a responsive self-checkout system in React, Redux, MobX, and TypeScript targeting both mobile web and Electron, with custom MUI-based components designed in Figma.',
      'Owned state and workflow orchestration with Redux Toolkit and Context API; tuned performance with React DevTools.',
      'Added a loyalty and rewards subsystem granting real-time discounts and points during checkout.',
      'Wrote unit, integration, and E2E tests with Jest, React Testing Library, and Cypress.',
    ],
    end: '2023',
    hash: 'e8c6d94',
    location: 'Remote',
    org: 'NCR Voyix (via Optomi)',
    role: 'React Developer',
    start: '2020',
  },
  {
    bullets: [
      'Integrated React components into the Ruby on Rails application that gated every Cisco software release for vulnerability and licensing compliance.',
      'Rebuilt UI, reports, and forms with designers and backend engineers; improved page load performance using Lighthouse and React DevTools.',
    ],
    end: '2020',
    hash: 'f1b9a52',
    location: 'RTP, NC',
    org: 'Aerotek / EASi at Cisco',
    role: 'Senior React Engineer (Contract)',
    start: '2019',
  },
  {
    bullets: [
      'Shipped features and bug fixes for the flagship transportation management system in React and ES6; supported clients and backend teams on cross-application issues.',
    ],
    end: '2019',
    hash: 'a4d7e63',
    location: 'Cary, NC',
    org: 'MercuryGate International',
    role: 'Senior Software Engineer',
    start: '2018',
  },
  {
    bullets: [
      'Senior React Developer at MetaMetrics; Senior Front-End Engineer at Distil Networks (now Imperva); Senior Software Engineer at PointSource; Senior Front-End Developer at BCBSNC. Delivered React, Vue, AngularJS, Backbone.js, and Django applications; authored design systems and style guides.',
    ],
    end: '2018',
    hash: 'b6f2c15',
    location: 'NC',
    org: 'MetaMetrics · Distil Networks · PointSource · BCBSNC',
    role: 'Earlier experience',
    start: '2014',
  },
];

export const CV_EDUCATION: { detail: string; title: string }[] = [
  {
    detail: 'East Carolina University, Greenville, NC — 2010',
    title: "Master's-level coursework in Software Engineering",
  },
  {
    detail: 'University of North Carolina Greensboro — 2005',
    title: 'B.A. in Spanish, minor in Business',
  },
];

export const CV_OPEN_SOURCE: string[] = [
  'Boudreaux / Fake Four Records — founding engineer, MPL 2.0 open-source music marketplace (github.com/braveneworg/boudreaux).',
  'Contributor to react-starter-kit (kriasoft) and mean.io (linnovate).',
  'Technical writing at mkelley33.com — Next.js, tsx REPL, reCAPTCHA with Formik.',
];
```

- [ ] **Step 2: Write the failing CareerBeat test**

Create `src/components/home/career-beat.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { CareerBeat } from '@/components/home/career-beat';
import { CV_EXPERIENCE } from '@/lib/cv-content';

describe('CareerBeat', () => {
  it('renders one commit line per experience entry', () => {
    render(<CareerBeat />);
    expect(screen.getByText('git log --career')).toBeInTheDocument();
    for (const entry of CV_EXPERIENCE) {
      expect(screen.getByText(entry.hash)).toBeInTheDocument();
      expect(
        screen.getByText(`${entry.role} — ${entry.org}`),
      ).toBeInTheDocument();
    }
  });

  it('links to the full cv', () => {
    render(<CareerBeat />);
    expect(
      screen.getByRole('link', { name: /full history: \.\/cv/i }),
    ).toHaveAttribute('href', '/cv');
  });
});
```

Run: FAIL.

- [ ] **Step 3: Implement `src/components/home/career-beat.tsx`**

```tsx
import Link from 'next/link';

import { TerminalSection } from '@/components/home/terminal-section';
import { CV_EXPERIENCE } from '@/lib/cv-content';

export function CareerBeat() {
  return (
    <TerminalSection command="git log --career">
      <ol className="space-y-3">
        {CV_EXPERIENCE.map((entry) => (
          <li
            className="flex flex-wrap items-baseline gap-x-3 font-mono text-sm"
            key={entry.hash}
          >
            <span className="text-phosphor">{entry.hash}</span>
            <span className="text-fg">
              {entry.role} — {entry.org}
            </span>
            <span className="text-xs text-fg-muted">
              {entry.start}–{entry.end}
            </span>
          </li>
        ))}
      </ol>
      <Link
        className="mt-6 inline-block font-mono text-sm text-phosphor underline underline-offset-4 transition-colors hover:text-fg"
        href="/cv"
      >
        full history: ./cv →
      </Link>
    </TerminalSection>
  );
}
```

Run: PASS.

- [ ] **Step 4: Write the failing OpenSourceBeat test**

Create `src/components/home/open-source-beat.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { OpenSourceBeat } from '@/components/home/open-source-beat';

describe('OpenSourceBeat', () => {
  it('renders this site, boudreaux, and contributions entries', () => {
    render(<OpenSourceBeat />);
    expect(screen.getByText('ls ./open-source')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /this-site\// })).toHaveAttribute(
      'href',
      'https://github.com/braveneworg/mkelley33',
    );
    expect(screen.getByRole('link', { name: /boudreaux\// })).toHaveAttribute(
      'href',
      'https://github.com/braveneworg/boudreaux',
    );
    expect(screen.getByText(/react-starter-kit/)).toBeInTheDocument();
    expect(screen.getByText(/mean\.io/)).toBeInTheDocument();
  });
});
```

Run: FAIL.

- [ ] **Step 5: Implement `src/components/home/open-source-beat.tsx`**

```tsx
import { TerminalSection } from '@/components/home/terminal-section';
import { siteConfig } from '@/lib/site-config';

export function OpenSourceBeat() {
  return (
    <TerminalSection command="ls ./open-source">
      <ul className="max-w-2xl space-y-5">
        <li>
          {siteConfig.repoUrl ? (
            <a
              className="font-mono text-sm text-phosphor underline underline-offset-4"
              href={siteConfig.repoUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              this-site/
            </a>
          ) : (
            <span className="font-mono text-sm text-phosphor">this-site/</span>
          )}
          <p className="mt-1 text-sm leading-relaxed text-fg-muted">
            You&apos;re looking at it. This entire site — design system, CMS,
            tests, CI — is open source on GitHub.
          </p>
        </li>
        <li>
          <a
            className="font-mono text-sm text-phosphor underline underline-offset-4"
            href="https://github.com/braveneworg/boudreaux"
            rel="noopener noreferrer"
            target="_blank"
          >
            boudreaux/
          </a>
          <p className="mt-1 text-sm leading-relaxed text-fg-muted">
            MPL 2.0 music marketplace for Fake Four Records — founding
            engineer. Streaming, downloads, and Stripe Connect payouts
            (fakefourrecords.com).
          </p>
        </li>
        <li>
          <span className="font-mono text-sm text-phosphor">
            contributions/
          </span>
          <p className="mt-1 text-sm leading-relaxed text-fg-muted">
            react-starter-kit (kriasoft) and mean.io (linnovate).
          </p>
        </li>
      </ul>
    </TerminalSection>
  );
}
```

Run: PASS.

- [ ] **Step 6: Write the failing ServicesBeat test**

Create `src/components/home/services-beat.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { ServicesBeat } from '@/components/home/services-beat';
import { SERVICES } from '@/lib/services-content';

describe('ServicesBeat', () => {
  it('renders a card per service linking to its anchor', () => {
    render(<ServicesBeat />);
    expect(screen.getByText('ls ./services')).toBeInTheDocument();
    for (const service of SERVICES) {
      expect(
        screen.getByRole('link', { name: new RegExp(`${service.slug}/`) }),
      ).toHaveAttribute('href', `/services#${service.slug}`);
    }
  });
});
```

Run: FAIL.

- [ ] **Step 7: Implement `src/components/home/services-beat.tsx`**

```tsx
import Link from 'next/link';

import { TerminalSection } from '@/components/home/terminal-section';
import { SERVICES } from '@/lib/services-content';

export function ServicesBeat() {
  return (
    <TerminalSection command="ls ./services">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((service) => (
          <li key={service.slug}>
            <Link
              className="block h-full rounded-lg border border-edge bg-surface p-4 transition-colors hover:border-phosphor"
              href={`/services#${service.slug}`}
            >
              <span className="font-mono text-sm text-phosphor">
                {service.slug}/
              </span>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                {service.name}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </TerminalSection>
  );
}
```

(The home beat reads the static `SERVICES` deliberately — no DB call above the fold; the services page itself is collection-backed.)

Run: PASS.

- [ ] **Step 8: Full gate and commit**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run src/components/home/
git add src/lib/cv-content.ts src/components/home/career-beat.tsx src/components/home/career-beat.test.tsx src/components/home/open-source-beat.tsx src/components/home/open-source-beat.test.tsx src/components/home/services-beat.tsx src/components/home/services-beat.test.tsx
git commit -m "feat: add cv content module and career, open-source, services beats"
```

---

### Task 6: Latest-posts beat, home assembly, Person JSON-LD

**Files:**
- Create: `src/components/home/latest-posts-beat.tsx`
- Modify: `src/app/(site)/page.tsx`, `src/app/(site)/layout.tsx`
- Test: `src/components/home/latest-posts-beat.test.tsx`

**Interfaces:**
- Consumes: `listPublishedPosts` (cached, Task 1), `makePost`, all beats from Tasks 4–5, `serializeJsonLd` from `src/lib/json-ld.ts`.
- Produces: `LatestPostsBeat` (props `{ posts: Post[] }`); assembled home page; site-wide `Person` JSON-LD in the layout.

- [ ] **Step 1: Write the failing LatestPostsBeat test**

Create `src/components/home/latest-posts-beat.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { LatestPostsBeat } from '@/components/home/latest-posts-beat';
import { makePost } from '@/test/make-post';

describe('LatestPostsBeat', () => {
  it('renders a link per post', () => {
    const posts = [
      makePost({ slug: 'one', title: 'First Post' }),
      makePost({ slug: 'two', title: 'Second Post' }),
    ];
    render(<LatestPostsBeat posts={posts} />);
    expect(screen.getByText('tail -3 ./blog')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /First Post/ })).toHaveAttribute(
      'href',
      '/blog/one',
    );
    expect(screen.getByRole('link', { name: /Second Post/ })).toHaveAttribute(
      'href',
      '/blog/two',
    );
  });

  it('renders an empty-state line with no posts', () => {
    render(<LatestPostsBeat posts={[]} />);
    expect(screen.getByText(/no posts yet/)).toBeInTheDocument();
  });
});
```

Run: FAIL.

- [ ] **Step 2: Implement `src/components/home/latest-posts-beat.tsx`**

```tsx
import Link from 'next/link';

import { TerminalSection } from '@/components/home/terminal-section';
import type { Post } from '@/payload-types';

export function LatestPostsBeat({ posts }: { posts: Post[] }) {
  return (
    <TerminalSection command="tail -3 ./blog">
      {posts.length === 0 ? (
        <p className="font-mono text-sm text-fg-muted"># no posts yet</p>
      ) : (
        <ul className="max-w-2xl space-y-4">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                className="group block"
                href={`/blog/${post.slug}`}
              >
                <span className="font-mono text-sm text-fg transition-colors group-hover:text-phosphor">
                  {post.title}
                </span>
                <span className="ml-3 font-mono text-xs text-fg-muted">
                  {post.publishedAt.slice(0, 10)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        className="mt-6 inline-block font-mono text-sm text-phosphor underline underline-offset-4 transition-colors hover:text-fg"
        href="/blog"
      >
        all posts: ./blog →
      </Link>
    </TerminalSection>
  );
}
```

Run: PASS.

- [ ] **Step 3: Assemble the home page**

Replace `src/app/(site)/page.tsx` with:

```tsx
import { AboutBeat } from '@/components/home/about-beat';
import { AiToolboxBeat } from '@/components/home/ai-toolbox-beat';
import { CareerBeat } from '@/components/home/career-beat';
import { Hero } from '@/components/home/hero';
import { LatestPostsBeat } from '@/components/home/latest-posts-beat';
import { OpenSourceBeat } from '@/components/home/open-source-beat';
import { ServicesBeat } from '@/components/home/services-beat';
import { listPublishedPosts } from '@/lib/repositories/posts';

export const revalidate = 300;

export default async function HomePage() {
  const posts = (await listPublishedPosts().catch(() => [])).slice(0, 3);
  return (
    <>
      <Hero />
      <AboutBeat />
      <AiToolboxBeat />
      <ServicesBeat />
      <CareerBeat />
      <OpenSourceBeat />
      <LatestPostsBeat posts={posts} />
    </>
  );
}
```

(Beat order is the spec's narrative order; the `$ subscribe --newsletter` beat lands in Phase 4 between LatestPostsBeat and the footer.)

- [ ] **Step 4: Add site-wide Person JSON-LD to the layout**

In `src/app/(site)/layout.tsx`:

1. Add imports (sorted):

```tsx
import { serializeJsonLd } from '@/lib/json-ld';
```

2. Above `RootLayout`, add:

```tsx
const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  jobTitle: 'Full-Stack AI Forward Deployed Engineer',
  name: siteConfig.name,
  sameAs: [
    siteConfig.socials.github,
    siteConfig.socials.linkedin,
    ...(siteConfig.socials.bluesky ? [siteConfig.socials.bluesky] : []),
  ],
  url: siteConfig.url,
};
```

3. Inside `<body>`, immediately before `</body>`'s closing content (after `</ThemeProvider>`), add:

```tsx
        <script
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(personJsonLd) }}
          type="application/ld+json"
        />
```

- [ ] **Step 5: Full gate and commit**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run src/components/home/ && pnpm build:ci
git add src/components/home/latest-posts-beat.tsx src/components/home/latest-posts-beat.test.tsx "src/app/(site)/page.tsx" "src/app/(site)/layout.tsx"
git commit -m "feat: assemble home narrative scroll with latest posts and person json-ld"
```

---

### Task 7: CV page with print stylesheet

**Files:**
- Create: `src/app/(site)/cv/page.tsx`, `src/components/cv/cv-document.tsx`
- Modify: `src/app/(site)/globals.css` (print rules)
- Test: `src/components/cv/cv-document.test.tsx`

**Interfaces:**
- Consumes: everything from `src/lib/cv-content.ts` (Task 5), `siteConfig` (incl. `resumePdf`, Task 1).
- Produces: `/cv` route; `CvDocument` component (props `{ resumePdf?: string | null }`, defaulting to `siteConfig.resumePdf`).

- [ ] **Step 1: Write the failing CvDocument test**

Create `src/components/cv/cv-document.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { CvDocument } from '@/components/cv/cv-document';
import { CV_EDUCATION, CV_EXPERIENCE, CV_SKILLS } from '@/lib/cv-content';

describe('CvDocument', () => {
  it('renders summary, every skill group, every role, and education', () => {
    render(<CvDocument resumePdf={null} />);
    expect(screen.getByText(/Senior full-stack software engineer/)).toBeInTheDocument();
    for (const group of CV_SKILLS) {
      expect(screen.getByText(group.label)).toBeInTheDocument();
    }
    for (const entry of CV_EXPERIENCE) {
      expect(
        screen.getByRole('heading', { name: entry.role }),
      ).toBeInTheDocument();
    }
    for (const item of CV_EDUCATION) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
    }
  });

  it('hides the download button while the pdf is pending', () => {
    render(<CvDocument resumePdf={null} />);
    expect(
      screen.queryByRole('link', { name: /download pdf/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the download button when the pdf exists', () => {
    render(<CvDocument resumePdf="/michaux-kelley-resume.pdf" />);
    expect(
      screen.getByRole('link', { name: /download pdf/i }),
    ).toHaveAttribute('href', '/michaux-kelley-resume.pdf');
  });
});
```

Run: FAIL.

- [ ] **Step 2: Implement `src/components/cv/cv-document.tsx`**

```tsx
import {
  CV_EDUCATION,
  CV_EXPERIENCE,
  CV_OPEN_SOURCE,
  CV_SKILLS,
  CV_SUMMARY,
} from '@/lib/cv-content';
import { siteConfig } from '@/lib/site-config';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 font-mono text-lg font-bold text-phosphor print:text-black">
      {children}
    </h2>
  );
}

export function CvDocument({
  resumePdf = siteConfig.resumePdf,
}: {
  resumePdf?: string | null;
}) {
  return (
    <article className="cv-document mx-auto w-full max-w-3xl px-5 py-16 sm:py-20">
      <p className="font-mono text-sm text-fg-muted print:hidden">
        <span className="text-phosphor">$</span> cat ./cv.md
      </p>
      <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight">
        {siteConfig.name}
      </h1>
      <p className="mt-2 font-mono text-sm text-fg-muted">
        Wake Forest, NC · me@mkelley33.com · mkelley33.com ·
        linkedin.com/in/mkelley33 · github.com/mkelley33
      </p>
      {resumePdf ? (
        <a
          className="mt-5 inline-block rounded border border-phosphor px-4 py-2 font-mono text-sm text-phosphor transition-colors hover:bg-phosphor hover:text-canvas print:hidden"
          download
          href={resumePdf}
        >
          Download PDF ↓
        </a>
      ) : null}

      <SectionHeading># Professional summary</SectionHeading>
      <p className="mt-3 leading-relaxed text-fg">{CV_SUMMARY}</p>

      <SectionHeading># Technical skills</SectionHeading>
      <dl className="mt-3 space-y-3">
        {CV_SKILLS.map((group) => (
          <div key={group.label}>
            <dt className="font-mono text-sm font-bold text-fg">
              {group.label}
            </dt>
            <dd className="mt-1 text-sm leading-relaxed text-fg-muted">
              {group.items}
            </dd>
          </div>
        ))}
      </dl>

      <SectionHeading># Professional experience</SectionHeading>
      <ol className="mt-3 space-y-8">
        {CV_EXPERIENCE.map((entry) => (
          <li key={entry.hash}>
            <h3 className="font-mono text-base font-bold text-fg">
              {entry.role}
            </h3>
            <p className="mt-1 font-mono text-sm text-fg-muted">
              {entry.org} · {entry.location} · {entry.start}–{entry.end}
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-fg">
              {entry.bullets.map((bullet) => (
                <li className="flex gap-2" key={bullet}>
                  <span aria-hidden="true" className="text-phosphor print:text-black">
                    ▸
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <SectionHeading># Education</SectionHeading>
      <ul className="mt-3 space-y-3">
        {CV_EDUCATION.map((item) => (
          <li key={item.title}>
            <p className="text-sm font-bold text-fg">{item.title}</p>
            <p className="text-sm text-fg-muted">{item.detail}</p>
          </li>
        ))}
      </ul>

      <SectionHeading># Open source &amp; writing</SectionHeading>
      <ul className="mt-3 space-y-2">
        {CV_OPEN_SOURCE.map((item) => (
          <li className="text-sm leading-relaxed text-fg" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}
```

Run: PASS.

- [ ] **Step 3: Create `src/app/(site)/cv/page.tsx`**

```tsx
import type { Metadata } from 'next';

import { CvDocument } from '@/components/cv/cv-document';

export const metadata: Metadata = {
  description:
    'CV of Michaux Kelley — senior full-stack engineer: React, Next.js, TypeScript, Node.js, AWS, and AI-assisted development.',
  title: 'cv',
};

export default function CvPage() {
  return <CvDocument />;
}
```

- [ ] **Step 4: Add print rules to `src/app/(site)/globals.css`**

Append:

```css
@media print {
  nav,
  footer {
    display: none !important;
  }
  body {
    background: #ffffff !important;
    color: #000000 !important;
  }
  .cv-document {
    max-width: none;
    padding: 0;
  }
  .cv-document a {
    color: #000000;
    text-decoration: none;
  }
}
```

(Print rules are exempt from the no-raw-hex constraint — print output is deliberately monochrome, outside the token system. Tailwind's `print:` variants in the component handle the accent colors; these rules handle document chrome.)

Verify manually: `pnpm dev`, open `/cv`, print preview shows a clean single-column black-on-white document with no nav/footer.

- [ ] **Step 5: Full gate and commit**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run src/components/cv/
git add src/components/cv/ "src/app/(site)/cv/" "src/app/(site)/globals.css"
git commit -m "feat: add cv page mirroring resume with print stylesheet"
```

---

### Task 8: Uses page, footer /uses link, sitemap entries

**Files:**
- Create: `src/app/(site)/uses/page.tsx`
- Modify: `src/components/site/site-footer.tsx`, `src/app/sitemap.ts`
- Test: `src/components/site/site-footer.test.tsx`

**Interfaces:**
- Consumes: `siteConfig.repoUrl` (Task 1); footer internal-link pattern from the RSS link.
- Produces: `/uses` route; footer `uses` link; sitemap entries for `/services`, `/cv`, `/uses`.

- [ ] **Step 1: Write the failing footer test**

Add to `src/components/site/site-footer.test.tsx`:

```tsx
  it('links the uses page internally', () => {
    render(<SiteFooter />);
    const uses = screen.getByRole('link', { name: 'uses' });
    expect(uses).toHaveAttribute('href', '/uses');
    expect(uses).not.toHaveAttribute('target');
  });
```

Run: `pnpm exec vitest run src/components/site/site-footer.test.tsx` — Expected: FAIL.

- [ ] **Step 2: Add the footer link**

In `src/components/site/site-footer.tsx`, inside the `<ul>`, immediately BEFORE the existing rss `<li>`, add:

```tsx
          <li>
            <a className="transition-colors hover:text-fg" href="/uses">
              uses
            </a>
          </li>
```

Run the footer test — Expected: PASS.

- [ ] **Step 3: Create `src/app/(site)/uses/page.tsx`**

The `/uses` content is static by design (spec: "content lives in code, not Payload"). Hardware copy is intentionally minimal; the owner may expand it post-merge.

```tsx
import type { Metadata } from 'next';

import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  description:
    'Hardware, editor, terminal, AI toolbox, and stack defaults — what I actually use.',
  title: 'uses',
};

interface UsesEntry {
  name: string;
  note: string;
}

interface UsesSection {
  entries: UsesEntry[];
  heading: string;
}

const SECTIONS: UsesSection[] = [
  {
    entries: [
      {
        name: 'MacBook Pro (Apple silicon)',
        note: 'The daily driver — everything below runs here.',
      },
    ],
    heading: 'hardware',
  },
  {
    entries: [
      { name: 'VS Code', note: 'Primary editor, Claude Code extension always open.' },
      { name: 'Claude Code CLI', note: 'Agentic work: refactors, tests, whole features.' },
      { name: 'Windsurf / Cascade', note: 'Agentic IDE — piloted it at enterprise scale.' },
      { name: 'zsh', note: 'With too many aliases to admit to.' },
      { name: 'JetBrains Mono', note: 'The only font on this site you are not reading right now.' },
    ],
    heading: 'editor & terminal',
  },
  {
    entries: [
      { name: 'Claude Code', note: 'Daily driver for agentic engineering.' },
      { name: 'GitHub Copilot', note: 'Inline completions and PR review.' },
      {
        name: 'MCP servers',
        note: 'Context7, SequentialThinking, Figma, Memory, Markitdown, chrome-devtools.',
      },
      {
        name: 'Skills',
        note: 'obra/superpowers, mattpocock/skills, and custom-built.',
      },
      {
        name: 'Prompt & context engineering',
        note: 'The discipline that makes the rest of this list work.',
      },
    ],
    heading: 'ai toolbox',
  },
  {
    entries: [
      { name: 'TypeScript (strict)', note: 'Non-negotiable.' },
      { name: 'React 19 + Next.js App Router', note: 'Server Components first.' },
      { name: 'Tailwind CSS 4', note: 'CSS-first tokens.' },
      { name: 'MongoDB Atlas', note: 'Via Payload or Prisma, per project.' },
      { name: 'Vitest + React Testing Library', note: '90%+ coverage, enforced in CI.' },
      { name: 'Playwright', note: 'E2E for the flows that pay the bills.' },
      { name: 'pnpm', note: 'Fast, strict, disk-friendly.' },
    ],
    heading: 'stack defaults',
  },
  {
    entries: [
      {
        name: 'Next.js 16 · React 19 · Payload 3 · Tailwind 4 · Shiki · Vercel',
        note: 'This site, end to end — and it is open source.',
      },
    ],
    heading: "this site's stack",
  },
];

export default function UsesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <p className="font-mono text-sm text-fg-muted">
        <span className="text-phosphor">$</span> cat ./uses.md
      </p>
      <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight sm:text-4xl">
        # Uses
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-fg-muted">
        The hardware, software, and AI tooling behind the work.
      </p>
      {SECTIONS.map((section) => (
        <section className="mt-10" key={section.heading}>
          <h2 className="font-mono text-lg font-bold text-phosphor">
            {section.heading}/
          </h2>
          <ul className="mt-4 max-w-2xl space-y-3">
            {section.entries.map((entry) => (
              <li key={entry.name}>
                <p className="font-mono text-sm text-fg">{entry.name}</p>
                <p className="text-sm text-fg-muted">{entry.note}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {siteConfig.repoUrl ? (
        <p className="mt-12 font-mono text-sm text-fg-muted">
          #{' '}
          <a
            className="text-phosphor underline underline-offset-4"
            href={siteConfig.repoUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            view source on github
          </a>
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Add the three static routes to `src/app/sitemap.ts`**

In the returned array, after `{ url: `${siteConfig.url}/blog` },` add:

```typescript
    { url: `${siteConfig.url}/services` },
    { url: `${siteConfig.url}/cv` },
    { url: `${siteConfig.url}/uses` },
```

- [ ] **Step 5: Full gate and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build:ci
git add "src/app/(site)/uses/" src/components/site/site-footer.tsx src/components/site/site-footer.test.tsx src/app/sitemap.ts
git commit -m "feat: add uses page, footer uses link, and sitemap entries"
```

(This task's gate runs the FULL `pnpm test:coverage` — the phase's last task must prove the 90% thresholds hold across everything Phase 3 added, before the final review.)

---

## Owner runbook (post-merge, not agent tasks)

- Run `pnpm seed:services` against Atlas (idempotent; safe to re-run).
- Supply headshot → drop in `/public`, set `siteConfig.headshot`.
- Supply resume PDF → drop in `/public`, set `siteConfig.resumePdf`.
- Supply Bluesky URL → set `siteConfig.socials.bluesky` (footer + Person JSON-LD pick it up).
- Review `/uses` hardware copy and the two pre-launch MDX edits from Phase 2's checklist (PR #2 body).
