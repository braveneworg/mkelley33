# Phase 2 — Content Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Payload 3 CMS embedded at `/admin` on MongoDB, a `posts` collection with Lexical + code blocks, the four legacy posts migrated with identical slugs, and working `/blog` + `/blog/[slug]` pages with Shiki highlighting, RSS, sitemap, and robots.

**Architecture:** Payload 3 installs inside the existing Next.js 16 app (route groups `(site)` for the public site, `(payload)` for admin/API). All data access goes through repository modules wrapping Payload's Local API; pages are RSC with ISR (`revalidate = 300`) plus Payload `afterChange`/`afterDelete` hooks calling `revalidatePath`. Integration tests run against `mongodb-memory-server` — no external database in tests or CI.

**Tech Stack:** Payload 3 (`payload`, `@payloadcms/next`, `@payloadcms/db-mongodb`, `@payloadcms/richtext-lexical`, `@payloadcms/storage-vercel-blob`), sharp, graphql, shiki, gray-matter, mongodb-memory-server. Existing: Next.js 16.2.x, React 19, TS 5.9 strict, Tailwind 4, Vitest 4, ESLint 9.

**Phase roadmap:** Plan 2 of 5. Phase 1 (Foundation) is merged to main. Spec: `docs/superpowers/specs/2026-07-25-mkelley33-redesign-design.md` (§4 architecture, §5 posts/media/users collections, §3 blog pages, §8 SEO, §9 migration).

## Global Constraints

- Package manager `pnpm@10.12.4`; Node from `.nvmrc`. TypeScript strict; never `any`. Named exports only (Next route files and tool-loader configs excepted; Next metadata/route conventions like `sitemap.ts`, `robots.ts`, `route.ts` require specific exports — allowed).
- Files kebab-case; tests colocated as `<name>.test.ts(x)`; integration tests as `<name>.int.test.ts` with `// @vitest-environment node` docblock.
- Env names (exact): `DATABASE_URL`, `PAYLOAD_SECRET`, `BLOB_READ_WRITE_TOKEN` (optional in dev). Never commit real values; `.env.example` documents them.
- Legacy slugs preserved verbatim: `create-a-nextjs-blog`, `npm-ing-and-npx-ing-commands`, `how-to-tx-node-repl`, `using-recaptcha-v2-with-formik`.
- Terminal voice: blog index breadcrumb `$ ls ./blog`; post breadcrumb `$ cat ./blog/<slug>.mdx`; mono headings, Inter prose (Hybrid treatment per spec §2).
- Phosphor token utilities from Phase 1 (`bg-canvas`, `bg-surface`, `border-edge`, `text-fg`, `text-fg-muted`, `text-phosphor`, `font-mono`, `bg-blueprint`) are the only color/typography vocabulary — no raw hex in components.
- Every commit message ends with:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` and the `Claude-Session:` line for the executing session.
- **Toolchain-drift protocol (learned in Phase 1):** if an installed package's API differs from this plan's code (import shape, option name, signature), report BLOCKED with the exact error — do not improvise. The controller authorizes adaptations and syncs the plan.
- Payload requires Next.js `16.2.6+` (repo has 16.2.11 ✓) and Node 20.9+ (✓).

---

### Task 1: Payload install and route-group restructure

**Files:**
- Modify: `package.json`, `next.config.ts`, `tsconfig.json`, `.gitignore`, `.github/workflows/ci.yml` (env for build comes in Task 8 — do NOT touch CI here)
- Move: `src/app/layout.tsx` → `src/app/(site)/layout.tsx`; `src/app/page.tsx` → `src/app/(site)/page.tsx`; `src/app/not-found.tsx` → `src/app/(site)/not-found.tsx`; `src/app/not-found.test.tsx` → `src/app/(site)/not-found.test.tsx`; `src/app/globals.css` → `src/app/(site)/globals.css`
- Create: `src/payload.config.ts`, `src/collections/users.ts`, `src/collections/media.ts`, `src/app/(payload)/**` (copied from Payload's blank template), `.env.example`, `.env.local` (developer-local, gitignored)

**Interfaces:**
- Consumes: Phase 1 layout/nav/footer.
- Produces: bootable `/admin`; `src/payload.config.ts` importable as `@payload-config`; `Users` and `Media` collection configs (named exports `Users`, `Media`); the `(site)`/`(payload)` route-group split every later task assumes.

- [ ] **Step 1: Install dependencies**

```bash
pnpm add payload @payloadcms/next @payloadcms/db-mongodb @payloadcms/richtext-lexical @payloadcms/storage-vercel-blob sharp graphql
```

Expected: payload 3.x. Record exact versions in your report.

- [ ] **Step 2: Move the frontend into the `(site)` route group**

```bash
mkdir -p "src/app/(site)"
git mv src/app/layout.tsx "src/app/(site)/layout.tsx"
git mv src/app/page.tsx "src/app/(site)/page.tsx"
git mv src/app/not-found.tsx "src/app/(site)/not-found.tsx"
git mv src/app/not-found.test.tsx "src/app/(site)/not-found.test.tsx"
git mv src/app/globals.css "src/app/(site)/globals.css"
```

No import edits needed: `layout.tsx` imports `./globals.css` relatively and everything else via `@/`. The `not-found.test.tsx` import of `@/app/not-found` must change to `@/app/(site)/not-found`.

- [ ] **Step 3: Copy the `(payload)` route group from the blank template**

Determine the installed version, then fetch the template pinned to it:

```bash
PAYLOAD_VERSION=$(node -p "require('payload/package.json').version")
pnpm dlx degit "payloadcms/payload/templates/blank/src/app/(payload)#v${PAYLOAD_VERSION}" "src/app/(payload)"
ls -R "src/app/(payload)"
```

Expected files (shape as of Payload 3.x): `layout.tsx`, `custom.scss`, `admin/[[...segments]]/page.tsx`, `admin/[[...segments]]/not-found.tsx`, `admin/importMap.js`, `api/[...slug]/route.ts`, `api/graphql/route.ts`, `api/graphql-playground/route.ts`. If degit fails on the tag, retry with `#main`. If the file set differs materially, report BLOCKED with the actual listing.

- [ ] **Step 4: Create `src/collections/users.ts`**

```typescript
import type { CollectionConfig } from 'payload';

export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'email' },
  auth: true,
  fields: [],
};
```

- [ ] **Step 5: Create `src/collections/media.ts`**

```typescript
import type { CollectionConfig } from 'payload';

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  fields: [{ name: 'alt', type: 'text', required: true }],
  upload: true,
};
```

- [ ] **Step 6: Create `src/payload.config.ts`**

```typescript
import path from 'path';
import { fileURLToPath } from 'url';

import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob';
import { buildConfig } from 'payload';
import sharp from 'sharp';

import { Media } from '@/collections/media';
import { Users } from '@/collections/users';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: { user: 'users' },
  collections: [Users, Media],
  db: mongooseAdapter({ url: process.env.DATABASE_URL ?? '' }),
  editor: lexicalEditor(),
  plugins: [
    ...(process.env.BLOB_READ_WRITE_TOKEN
      ? [
          vercelBlobStorage({
            collections: { media: true },
            token: process.env.BLOB_READ_WRITE_TOKEN,
          }),
        ]
      : []),
  ],
  secret: process.env.PAYLOAD_SECRET ?? '',
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
});
```

- [ ] **Step 7: Wire `withPayload` and the `@payload-config` path**

`next.config.ts` becomes:

```typescript
import { withPayload } from '@payloadcms/next/withPayload';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default withPayload(nextConfig);
```

In `tsconfig.json` `compilerOptions.paths`, add alongside `@/*`:

```json
"@payload-config": ["./src/payload.config.ts"]
```

- [ ] **Step 8: Env files and gitignore**

Create `.env.example`:

```bash
# MongoDB connection string (Atlas in prod; tests/CI use mongodb-memory-server)
DATABASE_URL=mongodb://127.0.0.1/mkelley33
# Long random string for Payload auth/encryption
PAYLOAD_SECRET=change-me
# Optional: enables Vercel Blob media storage when set
# BLOB_READ_WRITE_TOKEN=
```

Create `.env.local` with the same keys and a generated secret (`openssl rand -hex 32`); `DATABASE_URL` may point at nothing yet — dev-server boot only needs a value present to attempt connection when queried. Append to `.gitignore`:

```
media/
src/app/(payload)/admin/importMap.js
```

(importMap is regenerated; if the installed version expects it committed — build errors when ignored — un-ignore it and note the adaptation.)

- [ ] **Step 9: Add package scripts**

In `package.json` scripts, add:

```json
"payload": "payload",
"generate:types": "payload generate:types",
"generate:importmap": "payload generate:importmap"
```

- [ ] **Step 10: Verify boot and 404 behavior**

```bash
pnpm generate:importmap
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

All must pass (test count unchanged: 20). Build must list `/`, `/_not-found`, and `/admin/[[...segments]]`. Then `pnpm dev` briefly: `curl -s -o /dev/null -w '%{http_code}' localhost:3000/` → 200, `curl -s -o /dev/null -w '%{http_code}' localhost:3000/admin` → 200 (admin create-first-user screen compiles even without a reachable DB; if it 500s on DB connection, that is acceptable for now — note it), and `curl -s localhost:3000/no-such-page | grep -c 'command not found'` → ≥1. **If the moved 404 no longer renders for unmatched routes** (multiple-root-layout wrinkle), create `src/app/(site)/[...not-found]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';

export default function CatchAllNotFound() {
  notFound();
}
```

and re-verify.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: embed Payload CMS with users and media collections"
```

---

### Task 2: Posts collection, code block, hooks, generated types

**Files:**
- Create: `src/collections/posts.ts`, `src/collections/blocks/code-block.ts`, `src/collections/hooks/compute-read-time.ts`, `src/collections/hooks/revalidate-post.ts`
- Test: `src/collections/hooks/compute-read-time.test.ts`
- Modify: `src/payload.config.ts` (register Posts)
- Generated: `src/payload-types.ts` (committed)

**Interfaces:**
- Consumes: `payload.config.ts` from Task 1.
- Produces: `Posts` collection (slug `posts`; fields `title: string`, `slug: string` unique, `publishedAt: string` ISO date, `tags?: string[]`, `excerpt?: string`, `body: SerializedEditorState` richText, `readTime?: number`, `status: 'draft' | 'published'`); `CodeBlock` block slug `code` with fields `language`, `code`; generated `Post` type in `src/payload-types.ts` — every later task imports `Post` from `@/payload-types`.

- [ ] **Step 1: Write the failing readTime hook test**

Create `src/collections/hooks/compute-read-time.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import {
  extractLexicalText,
  readTimeMinutes,
} from '@/collections/hooks/compute-read-time';

function lexicalWithText(words: string[]): Record<string, unknown> {
  return {
    root: {
      children: [
        {
          children: words.map((text) => ({ text, type: 'text' })),
          type: 'paragraph',
        },
      ],
      type: 'root',
    },
  };
}

describe('extractLexicalText', () => {
  it('collects text from nested nodes', () => {
    expect(extractLexicalText(lexicalWithText(['hello', 'world']))).toContain(
      'hello',
    );
  });

  it('returns empty string for malformed input', () => {
    expect(extractLexicalText(null)).toBe('');
    expect(extractLexicalText({ root: 42 })).toBe('');
  });
});

describe('readTimeMinutes', () => {
  it('floors at one minute for short text', () => {
    expect(readTimeMinutes(lexicalWithText(['just', 'a', 'few', 'words']))).toBe(
      1,
    );
  });

  it('computes ceil(words/200)', () => {
    const words = Array.from({ length: 401 }, (_, i) => `w${i}`);
    expect(readTimeMinutes(lexicalWithText(words))).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `@/collections/hooks/compute-read-time`.

- [ ] **Step 3: Implement `src/collections/hooks/compute-read-time.ts`**

```typescript
import type { CollectionBeforeChangeHook } from 'payload';

interface LexicalNode {
  children?: unknown;
  text?: unknown;
}

export function extractLexicalText(state: unknown): string {
  const parts: string[] = [];
  const visit = (node: unknown): void => {
    if (node === null || typeof node !== 'object') {
      return;
    }
    const { children, text } = node as LexicalNode;
    if (typeof text === 'string') {
      parts.push(text);
    }
    if (Array.isArray(children)) {
      children.forEach(visit);
    }
  };
  const root =
    state !== null && typeof state === 'object'
      ? (state as { root?: unknown }).root
      : undefined;
  visit(root);
  return parts.join(' ');
}

export function readTimeMinutes(state: unknown): number {
  const words = extractLexicalText(state).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export const computeReadTime: CollectionBeforeChangeHook = ({ data }) => {
  if (data && data.body !== undefined) {
    data.readTime = readTimeMinutes(data.body);
  }
  return data;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test` — Expected: PASS (24 tests).

- [ ] **Step 5: Create `src/collections/blocks/code-block.ts`**

```typescript
import type { Block } from 'payload';

export const CODE_LANGUAGES = [
  'ts',
  'tsx',
  'js',
  'jsx',
  'bash',
  'json',
  'css',
  'html',
  'md',
  'text',
] as const;

export const CodeBlock: Block = {
  slug: 'code',
  fields: [
    {
      name: 'language',
      type: 'select',
      defaultValue: 'ts',
      options: CODE_LANGUAGES.map((value) => ({ label: value, value })),
      required: true,
    },
    { name: 'code', type: 'code', required: true },
  ],
  interfaceName: 'CodeBlockFields',
  jsx: {
    export: ({ fields }) => ({
      children: fields.code,
      props: { language: fields.language },
    }),
    import: ({ children, props }) => ({
      code: children,
      language:
        typeof props?.language === 'string' ? props.language : 'text',
    }),
  },
};
```

(The `jsx` import/export enables markdown fenced-code conversion in Task 4. If the installed `Block` type rejects the `jsx` property shape, report BLOCKED with the type error.)

- [ ] **Step 6: Create `src/collections/hooks/revalidate-post.ts`**

```typescript
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
} from 'payload';

async function revalidate(paths: string[]): Promise<void> {
  try {
    const { revalidatePath } = await import('next/cache');
    paths.forEach((p) => revalidatePath(p));
  } catch {
    // Outside the Next.js runtime (scripts, integration tests) — no-op.
  }
}

export const revalidateAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
}) => {
  const paths = ['/blog', `/blog/${doc.slug}`, '/feed.xml', '/sitemap.xml'];
  if (previousDoc?.slug && previousDoc.slug !== doc.slug) {
    paths.push(`/blog/${previousDoc.slug}`);
  }
  await revalidate(paths);
  return doc;
};

export const revalidateAfterDelete: CollectionAfterDeleteHook = async ({
  doc,
}) => {
  await revalidate(['/blog', `/blog/${doc.slug}`, '/feed.xml', '/sitemap.xml']);
  return doc;
};
```

- [ ] **Step 7: Create `src/collections/posts.ts`**

```typescript
import {
  BlocksFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import type { CollectionConfig } from 'payload';

import { CodeBlock } from '@/collections/blocks/code-block';
import { computeReadTime } from '@/collections/hooks/compute-read-time';
import {
  revalidateAfterChange,
  revalidateAfterDelete,
} from '@/collections/hooks/revalidate-post';

export const Posts: CollectionConfig = {
  slug: 'posts',
  access: {
    read: ({ req }) =>
      req.user ? true : { status: { equals: 'published' } },
  },
  admin: { defaultColumns: ['title', 'status', 'publishedAt'], useAsTitle: 'title' },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', index: true, required: true, unique: true },
    { name: 'publishedAt', type: 'date', required: true },
    { name: 'tags', type: 'text', hasMany: true },
    { name: 'excerpt', type: 'textarea' },
    {
      name: 'body',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          BlocksFeature({ blocks: [CodeBlock] }),
        ],
      }),
      required: true,
    },
    {
      name: 'readTime',
      type: 'number',
      admin: { description: 'Minutes — computed on save', readOnly: true },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      required: true,
    },
  ],
  hooks: {
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
    beforeChange: [computeReadTime],
  },
};
```

- [ ] **Step 8: Register in `src/payload.config.ts`**

Add `import { Posts } from '@/collections/posts';` (sorted) and change the collections line to `collections: [Users, Media, Posts],`.

- [ ] **Step 9: Generate and commit types**

```bash
pnpm generate:types
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

All pass. `src/payload-types.ts` now exports `Post`, `User`, `Media`, `CodeBlockFields`. (generate:types does not need a live DB. If it errors demanding one, report BLOCKED with output.)

**Known issue (from Task 1 execution):** the `payload generate:types` CLI fails on this Node 24 + tsx combo with `ERR_REQUIRE_ASYNC_MODULE` (upstream payloadcms/payload#16378). If it fails that way, use this fallback: inspect `node_modules/payload/dist/bin/` to find the function the `generate:types` bin invokes (prefer a public export from `payload` or `payload/node` if one exists), then create `scripts/generate-types.mjs` that imports that function and your config and calls it directly; run it with `node --import tsx/esm scripts/generate-types.mjs` (or plain `node` if no TS imports resolve through the config chain) and repoint the `generate:types` package script at it. If no invokable function can be found either, report BLOCKED with what the bin file actually contains.

- [ ] **Step 10: Commit**

```bash
git add src/collections/ src/payload.config.ts src/payload-types.ts
git commit -m "feat: add posts collection with code blocks, read time, and revalidation hooks"
```

---

### Task 3: Mongo-memory test harness, posts repository, deferred unit tests

**Files:**
- Create: `src/test/payload-harness.ts`, `src/lib/repositories/posts.ts`
- Test: `src/lib/repositories/posts.int.test.ts`
- Modify: `vitest.config.ts` (int-test timeouts), `src/components/site/theme-provider.test.tsx` (deferred Phase-1 backlog item)

**Interfaces:**
- Consumes: Posts collection + `Post` type from Task 2.
- Produces: `createTestPayload(): Promise<{ payload: Payload; teardown: () => Promise<void> }>` harness; repository named exports `listPublishedPosts(): Promise<Post[]>`, `getPostBySlug(slug: string): Promise<Post | null>` — Tasks 4-7 consume these exact signatures.

- [ ] **Step 1: Add dev dependency**

```bash
pnpm add -D mongodb-memory-server
```

- [ ] **Step 2: Create `src/test/payload-harness.ts`**

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Payload } from 'payload';

export interface TestPayload {
  payload: Payload;
  teardown: () => Promise<void>;
}

/**
 * Boots Payload against an in-memory MongoDB. Env vars must be set BEFORE
 * the payload config module is evaluated, so the config is imported
 * dynamically here — callers must not import `@payload-config` themselves.
 */
export async function createTestPayload(): Promise<TestPayload> {
  const mongod = await MongoMemoryServer.create();
  process.env.DATABASE_URL = mongod.getUri();
  process.env.PAYLOAD_SECRET ??= 'test-secret';
  const { getPayload } = await import('payload');
  const { default: config } = await import('@payload-config');
  const payload = await getPayload({ config });
  return {
    payload,
    teardown: async () => {
      await payload.destroy();
      await mongod.stop();
    },
  };
}
```

(If `payload.destroy()` does not exist in the installed version, use the documented shutdown equivalent and note the adaptation; as a last resort omit the destroy and only stop mongod.)

- [ ] **Step 3: Raise integration timeouts in `vitest.config.ts`**

Inside the `test` object add:

```typescript
    hookTimeout: 120_000,
    testTimeout: 30_000,
```

(First run downloads a MongoDB binary — minutes, once; afterwards cached in `~/.cache/mongodb-binaries`.)

- [ ] **Step 4: Write the failing repository integration test**

Create `src/lib/repositories/posts.int.test.ts`:

```typescript
// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { TestPayload } from '@/test/payload-harness';
import { createTestPayload } from '@/test/payload-harness';

let harness: TestPayload;
let repo: typeof import('@/lib/repositories/posts');

const body = {
  root: {
    children: [
      {
        children: [{ text: 'hello content', type: 'text', version: 1 }],
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
};

beforeAll(async () => {
  harness = await createTestPayload();
  repo = await import('@/lib/repositories/posts');
  const mk = (slug: string, status: 'draft' | 'published', publishedAt: string) =>
    harness.payload.create({
      collection: 'posts',
      data: { body, publishedAt, slug, status, title: slug },
      overrideAccess: true,
    });
  await mk('newest-post', 'published', '2024-02-06T00:00:00.000Z');
  await mk('older-post', 'published', '2023-07-07T00:00:00.000Z');
  await mk('secret-draft', 'draft', '2024-03-01T00:00:00.000Z');
});

afterAll(async () => {
  await harness.teardown();
});

describe('listPublishedPosts', () => {
  it('returns only published posts, newest first', async () => {
    const posts = await repo.listPublishedPosts();
    expect(posts.map((p) => p.slug)).toEqual(['newest-post', 'older-post']);
  });

  it('computes readTime via the beforeChange hook', async () => {
    const posts = await repo.listPublishedPosts();
    expect(posts[0]?.readTime).toBe(1);
  });
});

describe('getPostBySlug', () => {
  it('returns the published post', async () => {
    const post = await repo.getPostBySlug('older-post');
    expect(post?.title).toBe('older-post');
  });

  it('returns null for drafts and unknown slugs', async () => {
    expect(await repo.getPostBySlug('secret-draft')).toBeNull();
    expect(await repo.getPostBySlug('nope')).toBeNull();
  });
});
```

- [ ] **Step 5: Run to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `@/lib/repositories/posts`. (The harness boot must succeed first; if the binary download is slow, that is the hookTimeout's job.)

- [ ] **Step 6: Implement `src/lib/repositories/posts.ts`**

```typescript
import config from '@payload-config';
import { getPayload } from 'payload';

import type { Post } from '@/payload-types';

async function client() {
  return getPayload({ config });
}

export async function listPublishedPosts(): Promise<Post[]> {
  const payload = await client();
  const result = await payload.find({
    collection: 'posts',
    limit: 100,
    overrideAccess: false,
    sort: '-publishedAt',
    where: { status: { equals: 'published' } },
  });
  return result.docs;
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const payload = await client();
  const result = await payload.find({
    collection: 'posts',
    limit: 1,
    overrideAccess: false,
    where: {
      and: [
        { slug: { equals: slug } },
        { status: { equals: 'published' } },
      ],
    },
  });
  return result.docs[0] ?? null;
}
```

- [ ] **Step 7: Run to verify it passes**

Run: `pnpm test` — Expected: PASS (28 tests).

- [ ] **Step 8: Close the deferred theme-provider assertion gap (Phase 1 backlog)**

In `src/components/site/theme-provider.test.tsx`, add inside the describe block:

```tsx
  it('applies the resolved theme class through the wrapper', async () => {
    window.localStorage.setItem('theme', 'dark');
    render(
      <ThemeProvider>
        <p>themed</p>
      </ThemeProvider>,
    );
    await waitFor(() =>
      expect(document.documentElement).toHaveClass('dark'),
    );
  });
```

and extend the imports line to `import { render, screen, waitFor } from '@testing-library/react';`.

- [ ] **Step 9: Full gate and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build
```

All pass; coverage thresholds still met (repositories are exercised by the int test).

```bash
git add src/test/payload-harness.ts src/lib/repositories/ vitest.config.ts src/components/site/theme-provider.test.tsx package.json pnpm-lock.yaml
git commit -m "feat: add posts repository with mongodb-memory-server integration tests"
```

---

### Task 4: Legacy post migration

**Files:**
- Create: `scripts/content/` (four `.mdx` files fetched from the old site's repo), `src/lib/migration/migrate-posts.ts`, `scripts/migrate-posts.ts`
- Test: `src/lib/migration/migrate-posts.int.test.ts`

**Interfaces:**
- Consumes: harness + Posts collection.
- Produces: `migratePosts(payload: Payload, contentDir: string): Promise<{ created: string[]; updated: string[] }>`; committed source MDX under `scripts/content/`; a CLI entry the owner runs against Atlas post-deploy.

- [ ] **Step 1: Fetch the legacy MDX sources**

Discover and download the posts from the old public repo:

```bash
mkdir -p scripts/content
gh api repos/mkelley33/mkelley33-pwa/git/trees/HEAD?recursive=1 --jq '.tree[].path' | grep -Ei '\.mdx?$'
```

For each of the four post files found (they correspond to slugs `create-a-nextjs-blog`, `npm-ing-and-npx-ing-commands`, `how-to-tx-node-repl`, `using-recaptcha-v2-with-formik`):

```bash
gh api "repos/mkelley33/mkelley33-pwa/contents/<path>" --jq '.content' | base64 -d > "scripts/content/<slug>.mdx"
```

Name each local file exactly `<slug>.mdx`. Inspect one file and record its frontmatter keys in your report (expected shape: `title`, `date`, `description`; adapt the mapping in Step 4 if keys differ — that adaptation is pre-authorized, note it).

- [ ] **Step 2: Add gray-matter**

```bash
pnpm add gray-matter
```

- [ ] **Step 3: Write the failing migration integration test**

Create `src/lib/migration/migrate-posts.int.test.ts`:

```typescript
// @vitest-environment node
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { migratePosts } from '@/lib/migration/migrate-posts';
import type { TestPayload } from '@/test/payload-harness';
import { createTestPayload } from '@/test/payload-harness';

const CONTENT_DIR = path.resolve(process.cwd(), 'scripts/content');
const EXPECTED_SLUGS = [
  'create-a-nextjs-blog',
  'how-to-tx-node-repl',
  'npm-ing-and-npx-ing-commands',
  'using-recaptcha-v2-with-formik',
];

let harness: TestPayload;

beforeAll(async () => {
  harness = await createTestPayload();
});

afterAll(async () => {
  await harness.teardown();
});

describe('migratePosts', () => {
  it('creates all four legacy posts with exact slugs, published', async () => {
    const result = await migratePosts(harness.payload, CONTENT_DIR);
    expect(result.created.sort()).toEqual(EXPECTED_SLUGS);
    const found = await harness.payload.find({
      collection: 'posts',
      limit: 10,
      where: { status: { equals: 'published' } },
    });
    expect(found.docs.map((d) => d.slug).sort()).toEqual(EXPECTED_SLUGS);
  });

  it('preserves original dates and titles', async () => {
    const post = await harness.payload.find({
      collection: 'posts',
      where: { slug: { equals: 'create-a-nextjs-blog' } },
    });
    expect(post.docs[0]?.publishedAt).toContain('2024-02');
    expect(post.docs[0]?.title.toLowerCase()).toContain('next.js');
  });

  it('converts fenced code into content (body is non-trivial)', async () => {
    const post = await harness.payload.find({
      collection: 'posts',
      where: { slug: { equals: 'create-a-nextjs-blog' } },
    });
    const json = JSON.stringify(post.docs[0]?.body);
    expect(json.length).toBeGreaterThan(500);
    expect(json).toMatch(/"type":\s*"block"|"type":\s*"code"/);
  });

  it('is idempotent — second run updates instead of duplicating', async () => {
    const second = await migratePosts(harness.payload, CONTENT_DIR);
    expect(second.created).toEqual([]);
    expect(second.updated.sort()).toEqual(EXPECTED_SLUGS);
    const all = await harness.payload.find({ collection: 'posts', limit: 20 });
    expect(all.totalDocs).toBe(4);
  });
});
```

- [ ] **Step 4: Run to verify it fails, then implement `src/lib/migration/migrate-posts.ts`**

Run `pnpm test` → FAIL (cannot resolve `@/lib/migration/migrate-posts`). Then:

```typescript
import { promises as fs } from 'fs';
import path from 'path';

import {
  convertMarkdownToLexical,
  editorConfigFactory,
} from '@payloadcms/richtext-lexical';
import matter from 'gray-matter';
import type { Payload } from 'payload';

export interface MigrationResult {
  created: string[];
  updated: string[];
}

/** Drop MDX-only lines (imports/exports/JSX component tags) that the
 * markdown converter cannot represent. */
export function stripMdxArtifacts(markdown: string): string {
  return markdown
    .split('\n')
    .filter(
      (line) =>
        !/^\s*(import\s.+from\s.+|export\s)/.test(line) &&
        !/^\s*<\/?[A-Z][A-Za-z]*/.test(line),
    )
    .join('\n');
}

export async function migratePosts(
  payload: Payload,
  contentDir: string,
): Promise<MigrationResult> {
  const result: MigrationResult = { created: [], updated: [] };
  const editorConfig = await editorConfigFactory.default({
    config: payload.config,
  });
  const files = (await fs.readdir(contentDir)).filter((f) =>
    f.endsWith('.mdx'),
  );

  for (const file of files.sort()) {
    const slug = path.basename(file, '.mdx');
    const raw = await fs.readFile(path.join(contentDir, file), 'utf8');
    const { content, data: front } = matter(raw);
    const body = convertMarkdownToLexical({
      editorConfig,
      markdown: stripMdxArtifacts(content),
    });
    const title =
      typeof front.title === 'string' ? front.title : slug;
    const publishedAt = new Date(
      typeof front.date === 'string' || front.date instanceof Date
        ? front.date
        : Date.now(),
    ).toISOString();
    const excerpt =
      typeof front.description === 'string' ? front.description : undefined;

    const existing = await payload.find({
      collection: 'posts',
      limit: 1,
      where: { slug: { equals: slug } },
    });
    const data = {
      body,
      excerpt,
      publishedAt,
      slug,
      status: 'published' as const,
      title,
    };
    if (existing.docs[0]) {
      await payload.update({
        collection: 'posts',
        data,
        id: existing.docs[0].id,
        overrideAccess: true,
      });
      result.updated.push(slug);
    } else {
      await payload.create({ collection: 'posts', data, overrideAccess: true });
      result.created.push(slug);
    }
  }
  return result;
}
```

Type note: if `convertMarkdownToLexical`'s return type does not directly satisfy the generated `Post['body']` type, adapt with a single `as Post['body']` assertion at the `body` property and note it (conversion output is the canonical editor state; the assertion is sound). If the function or `editorConfigFactory` import differs in the installed version, report BLOCKED.

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test` — Expected: PASS (32 tests). If the fenced-code assertion fails because the markdown converter emitted no code/block nodes, report BLOCKED quoting the produced body JSON for one post — the controller will authorize a fence-splitting fallback.

- [ ] **Step 6: Create the CLI wrapper `scripts/migrate-posts.ts`**

```typescript
import path from 'path';

import config from '@payload-config';
import { getPayload } from 'payload';

import { migratePosts } from '@/lib/migration/migrate-posts';

async function run(): Promise<void> {
  const payload = await getPayload({ config });
  const result = await migratePosts(
    payload,
    path.resolve(process.cwd(), 'scripts/content'),
  );
  payload.logger.info(
    `migration complete — created: [${result.created.join(', ')}] updated: [${result.updated.join(', ')}]`,
  );
  process.exit(0);
}

void run();
```

Add script to `package.json`: `"migrate:posts": "payload run scripts/migrate-posts.ts"`. Do NOT run it against a real database in this task — the owner runs it once Atlas credentials are in `.env.local`/Vercel. (If `payload run` is unavailable in the installed version, note it and leave the script; runner choice is deferred to the owner runbook.)

- [ ] **Step 7: Full gate and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add scripts/ src/lib/migration/ package.json pnpm-lock.yaml
git commit -m "feat: add idempotent legacy post migration with committed MDX sources"
```

---

### Task 5: Blog index page

**Files:**
- Create: `src/components/blog/post-list.tsx`, `src/app/(site)/blog/page.tsx`
- Test: `src/components/blog/post-list.test.tsx`, `src/test/make-post.ts` (shared fixture builder)

**Interfaces:**
- Consumes: `listPublishedPosts` from Task 3; `Post` from `@/payload-types`.
- Produces: `PostList` component (props `{ posts: Post[] }`); `makePost(overrides?: Partial<Post>): Post` fixture builder — Task 6 reuses it.

- [ ] **Step 1: Create the fixture builder `src/test/make-post.ts`**

```typescript
import type { Post } from '@/payload-types';

let counter = 0;

export function makePost(overrides: Partial<Post> = {}): Post {
  counter += 1;
  const base: Post = {
    body: {
      root: {
        children: [
          {
            children: [{ text: 'body text', type: 'text', version: 1 }],
            direction: null,
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
          },
        ],
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    } as Post['body'],
    createdAt: '2024-01-01T00:00:00.000Z',
    excerpt: 'An excerpt.',
    id: `post-${counter}`,
    publishedAt: '2024-02-06T00:00:00.000Z',
    readTime: 3,
    slug: `post-${counter}`,
    status: 'published',
    tags: ['nextjs', 'typescript'],
    title: `Post ${counter}`,
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
  return { ...base, ...overrides };
}
```

(If the generated `Post` type has additional required fields, add them here with sensible literals — that is expected, not a deviation. `id` may be typed `string` or `number` in generated types; match it.)

- [ ] **Step 2: Write the failing PostList test**

Create `src/components/blog/post-list.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { PostList } from '@/components/blog/post-list';
import { makePost } from '@/test/make-post';

describe('PostList', () => {
  it('renders a link, date, read time, and excerpt per post', () => {
    const post = makePost({
      excerpt: 'How to build a blog.',
      readTime: 4,
      slug: 'create-a-nextjs-blog',
      title: 'How to create a Next.js blog using MDX',
    });
    render(<PostList posts={[post]} />);
    expect(
      screen.getByRole('link', {
        name: /how to create a next\.js blog using mdx/i,
      }),
    ).toHaveAttribute('href', '/blog/create-a-nextjs-blog');
    expect(screen.getByText('2024-02-06')).toBeInTheDocument();
    expect(screen.getByText('4 min')).toBeInTheDocument();
    expect(screen.getByText('How to build a blog.')).toBeInTheDocument();
  });

  it('renders the empty state when there are no posts', () => {
    render(<PostList posts={[]} />);
    expect(screen.getByText(/total 0/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm test` — Expected: FAIL, cannot resolve `@/components/blog/post-list`.

- [ ] **Step 4: Implement `src/components/blog/post-list.tsx`**

```tsx
import Link from 'next/link';

import type { Post } from '@/payload-types';

function isoDate(value: string): string {
  return value.slice(0, 10);
}

export function PostList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <p className="font-mono text-sm text-fg-muted">
        total 0 — nothing committed here yet.
      </p>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-edge">
      {posts.map((post) => (
        <li className="py-6 first:pt-0" key={post.id}>
          <article>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-xs text-fg-muted">
              <time dateTime={post.publishedAt}>
                {isoDate(post.publishedAt)}
              </time>
              {typeof post.readTime === 'number' ? (
                <span>{post.readTime} min</span>
              ) : null}
              {(post.tags ?? []).map((tag) => (
                <span className="text-phosphor" key={tag}>
                  #{tag}
                </span>
              ))}
            </div>
            <h2 className="mt-2 font-mono text-xl font-bold tracking-tight">
              <Link
                className="transition-colors hover:text-phosphor"
                href={`/blog/${post.slug}`}
              >
                {post.title}
              </Link>
            </h2>
            {post.excerpt ? (
              <p className="mt-2 max-w-2xl leading-relaxed text-fg-muted">
                {post.excerpt}
              </p>
            ) : null}
          </article>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test` — Expected: PASS (34 tests).

- [ ] **Step 6: Create `src/app/(site)/blog/page.tsx`**

```tsx
import type { Metadata } from 'next';

import { PostList } from '@/components/blog/post-list';
import { listPublishedPosts } from '@/lib/repositories/posts';

export const revalidate = 300;

export const metadata: Metadata = {
  description:
    'Technical writing on React, Next.js, TypeScript, Node.js, and AI-assisted engineering.',
  title: 'blog',
};

export default async function BlogIndexPage() {
  const posts = await listPublishedPosts();
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <p className="font-mono text-sm text-phosphor">$ ls ./blog</p>
      <h1 className="mt-3 font-mono text-3xl font-bold tracking-tight">
        # blog
      </h1>
      <div className="mt-10">
        <PostList posts={posts} />
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Full gate and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Build note: `pnpm build` now queries the DB for `/blog` prerendering. With an unreachable `DATABASE_URL` the build may fail — if so, run the build via the Task 8 memory-DB script pattern manually (`DATABASE_URL` from a scratch `MongoMemoryServer`), note it, and Task 8 makes this permanent. Do not skip the build check.

```bash
git add src/components/blog/ "src/app/(site)/blog/" src/test/make-post.ts
git commit -m "feat: add blog index with terminal ls treatment"
```

---

### Task 6: Post page with Shiki rendering

**Files:**
- Create: `src/lib/highlight.ts`, `src/components/blog/copy-button.tsx`, `src/components/blog/code-snippet.tsx`, `src/components/blog/post-body.tsx`, `src/app/(site)/blog/[slug]/page.tsx`
- Test: `src/lib/highlight.test.ts`, `src/components/blog/copy-button.test.tsx`
- Modify: `src/app/(site)/globals.css` (Shiki dual-theme CSS), `src/components/site/site-nav.test.tsx` (deferred nested-route case)

**Interfaces:**
- Consumes: `getPostBySlug`, `listPublishedPosts`, `Post`, `CodeBlockFields`, `makePost`.
- Produces: post route `/blog/[slug]`; `highlightCode(code: string, language: string): Promise<string>`; `PostBody` ({ body: Post['body'] }); `CopyButton` ({ code: string }).

- [ ] **Step 1: Add shiki**

```bash
pnpm add shiki
```

- [ ] **Step 2: Write the failing highlight test**

Create `src/lib/highlight.test.ts`:

```typescript
// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { highlightCode } from '@/lib/highlight';

describe('highlightCode', () => {
  it('returns dual-theme shiki html for a known language', async () => {
    const html = await highlightCode("const x = 'y';", 'ts');
    expect(html).toContain('shiki');
    expect(html).toContain('--shiki-dark');
  });

  it('falls back to plain text for unknown languages', async () => {
    const html = await highlightCode('whatever', 'not-a-language');
    expect(html).toContain('whatever');
  });
});
```

- [ ] **Step 3: Run to verify it fails, then implement `src/lib/highlight.ts`**

Run `pnpm test` → FAIL (cannot resolve `@/lib/highlight`). Then:

```typescript
import { codeToHtml } from 'shiki';

const THEMES = { dark: 'github-dark-default', light: 'github-light-default' };

export async function highlightCode(
  code: string,
  language: string,
): Promise<string> {
  try {
    return await codeToHtml(code, {
      defaultColor: 'light',
      lang: language,
      themes: THEMES,
    });
  } catch {
    return codeToHtml(code, {
      defaultColor: 'light',
      lang: 'text',
      themes: THEMES,
    });
  }
}
```

Run `pnpm test` → PASS.

- [ ] **Step 4: Shiki dual-theme CSS**

Append to `src/app/(site)/globals.css`:

```css
.shiki {
  overflow-x: auto;
  padding: 1rem;
  font-size: 0.85rem;
  line-height: 1.7;
}

.dark .shiki,
.dark .shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}
```

- [ ] **Step 5: Write the failing CopyButton test**

Create `src/components/blog/copy-button.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { CopyButton } from '@/components/blog/copy-button';

describe('CopyButton', () => {
  it('copies the code and confirms', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const user = userEvent.setup({ writeToClipboard: false });
    render(<CopyButton code="pnpm dev" />);
    await user.click(screen.getByRole('button', { name: /copy code/i }));
    expect(writeText).toHaveBeenCalledWith('pnpm dev');
    await waitFor(() => expect(screen.getByText('copied ✓')).toBeInTheDocument());
  });
});
```

(If `userEvent.setup`'s option name for clipboard stubbing differs in the installed version, drop the option and keep the manual `Object.assign` mock.)

- [ ] **Step 6: Run to verify it fails, then implement `src/components/blog/copy-button.tsx`**

```tsx
'use client';

import { useState } from 'react';

export function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions/insecure context) — stay quiet.
    }
  };

  return (
    <button
      aria-label="Copy code"
      className="font-mono text-xs text-fg-muted transition-colors hover:text-phosphor"
      onClick={() => void copy()}
      type="button"
    >
      {copied ? 'copied ✓' : 'copy'}
    </button>
  );
}
```

Run `pnpm test` → PASS.

- [ ] **Step 7: Implement `src/components/blog/code-snippet.tsx`** (async RSC — no unit test; covered by build + E2E later)

```tsx
import { CopyButton } from '@/components/blog/copy-button';
import { highlightCode } from '@/lib/highlight';

export async function CodeSnippet({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const html = await highlightCode(code, language);
  return (
    <figure className="my-6 overflow-hidden rounded-lg border border-edge bg-surface">
      <figcaption className="flex items-center justify-between border-b border-edge px-4 py-2">
        <span className="font-mono text-xs text-fg-muted">{language}</span>
        <CopyButton code={code} />
      </figcaption>
      {/* Shiki output is trusted server-generated markup */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  );
}
```

- [ ] **Step 8: Implement `src/components/blog/post-body.tsx`**

```tsx
import type { JSXConvertersFunction } from '@payloadcms/richtext-lexical/react';
import { RichText } from '@payloadcms/richtext-lexical/react';

import { CodeSnippet } from '@/components/blog/code-snippet';
import type { Post } from '@/payload-types';

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  blocks: {
    code: ({ node }) => (
      <CodeSnippet
        code={String(node.fields.code ?? '')}
        language={String(node.fields.language ?? 'text')}
      />
    ),
  },
});

export function PostBody({ body }: { body: Post['body'] }) {
  return (
    <div className="prose-terminal mt-8 max-w-2xl leading-relaxed [&_a]:text-phosphor [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-10 [&_h2]:font-mono [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-phosphor [&_h3]:mt-8 [&_h3]:font-mono [&_h3]:font-bold [&_li]:my-1 [&_p]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_code]:font-mono [&_code]:text-sm"
      >
      <RichText converters={converters} data={body} />
    </div>
  );
}
```

(If the installed `JSXConvertersFunction` requires a generic parameter for typed block nodes, add it per the type error — pre-authorized adaptation; note it.)

- [ ] **Step 8b: PostBody render test** (proves serialized Lexical actually renders through RichText — no DB needed)

Create `src/components/blog/post-body.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { PostBody } from '@/components/blog/post-body';
import { makePost } from '@/test/make-post';

describe('PostBody', () => {
  it('renders paragraph text from a serialized lexical body', () => {
    render(<PostBody body={makePost().body} />);
    expect(screen.getByText('body text')).toBeInTheDocument();
  });
});
```

Run `pnpm test` → PASS. (If RichText warns about missing converters for the fixture's node types, that warning is a finding — resolve it, don't ignore it.)

- [ ] **Step 9: Create `src/app/(site)/blog/[slug]/page.tsx`**

```tsx
import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { PostBody } from '@/components/blog/post-body';
import { getPostBySlug, listPublishedPosts } from '@/lib/repositories/posts';
import { siteConfig } from '@/lib/site-config';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const posts = await listPublishedPosts();
    return posts.map((post) => ({ slug: post.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return { title: 'command not found' };
  }
  return { description: post.excerpt ?? undefined, title: post.title };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    notFound();
  }
  const all = await listPublishedPosts();
  const index = all.findIndex((p) => p.slug === post.slug);
  const newer = index > 0 ? all[index - 1] : undefined;
  const older = index >= 0 ? all[index + 1] : undefined;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    author: { '@type': 'Person', name: siteConfig.name },
    datePublished: post.publishedAt,
    description: post.excerpt ?? undefined,
    headline: post.title,
    url: `${siteConfig.url}/blog/${post.slug}`,
  };
  return (
    <article className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <p className="font-mono text-sm text-fg-muted">
        <span className="text-phosphor">$</span> cat ./blog/{slug}.mdx
      </p>
      <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight sm:text-4xl">
        # {post.title}
      </h1>
      <p className="mt-3 flex flex-wrap gap-x-4 font-mono text-xs text-fg-muted">
        <time dateTime={post.publishedAt}>{post.publishedAt.slice(0, 10)}</time>
        {typeof post.readTime === 'number' ? (
          <span>{post.readTime} min read</span>
        ) : null}
        {(post.tags ?? []).map((tag) => (
          <span className="text-phosphor" key={tag}>
            #{tag}
          </span>
        ))}
      </p>
      <PostBody body={post.body} />
      <nav
        aria-label="Adjacent posts"
        className="mt-12 flex flex-wrap justify-between gap-4 border-t border-edge pt-6 font-mono text-sm"
      >
        {older ? (
          <Link
            className="text-fg-muted transition-colors hover:text-phosphor"
            href={`/blog/${older.slug}`}
          >
            ← {older.title}
          </Link>
        ) : (
          <span />
        )}
        {newer ? (
          <Link
            className="text-fg-muted transition-colors hover:text-phosphor"
            href={`/blog/${newer.slug}`}
          >
            {newer.title} →
          </Link>
        ) : null}
      </nav>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />
    </article>
  );
}
```

Add `import Link from 'next/link';` to the page's imports (sorted with the other `next/*` imports).

- [ ] **Step 10: Close the deferred nav nested-route test gap (Phase 1 backlog)**

`src/components/site/site-nav.test.tsx` mocks `usePathname` module-wide. Convert the mock to a mutable holder and add the nested case. Replace the `vi.mock` block with:

```tsx
const pathnameHolder = { current: '/' };

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameHolder.current,
}));
```

add `beforeEach(() => { pathnameHolder.current = '/'; });` inside the describe, and add:

```tsx
  it('marks ./blog current on nested post routes', () => {
    pathnameHolder.current = '/blog/create-a-nextjs-blog';
    render(<SiteNav />);
    expect(screen.getByRole('link', { name: './blog' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: './home' })).not.toHaveAttribute(
      'aria-current',
    );
  });
```

- [ ] **Step 11: Full gate and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

(Build DB caveat as in Task 5 — use the memory-DB pattern if needed, note it.)

```bash
git add src/lib/highlight.ts src/lib/highlight.test.ts src/components/blog/ "src/app/(site)/blog/[slug]/" "src/app/(site)/globals.css" src/components/site/site-nav.test.tsx package.json pnpm-lock.yaml
git commit -m "feat: add post page with shiki code rendering and json-ld"
```

---

### Task 7: RSS, sitemap, robots, footer RSS link

**Files:**
- Create: `src/lib/rss.ts`, `src/app/(site)/feed.xml/route.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`
- Test: `src/lib/rss.test.ts`
- Modify: `src/components/site/site-footer.tsx`, `src/components/site/site-footer.test.tsx`

**Interfaces:**
- Consumes: `listPublishedPosts`, `siteConfig`, `makePost`.
- Produces: `/feed.xml`, `/sitemap.xml`, `/robots.txt`; `buildRssXml(posts: Post[]): string`.

- [ ] **Step 1: Write the failing RSS test**

Create `src/lib/rss.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { buildRssXml } from '@/lib/rss';
import { makePost } from '@/test/make-post';

describe('buildRssXml', () => {
  it('produces channel metadata and one item per post', () => {
    const xml = buildRssXml([
      makePost({ slug: 'a-post', title: 'A <Post> & Friends' }),
    ]);
    expect(xml).toContain('<rss version="2.0">');
    expect(xml).toContain('<link>https://mkelley33.com/blog/a-post</link>');
    expect(xml).toContain('A &lt;Post&gt; &amp; Friends');
    expect(xml).not.toContain('<Post>');
  });

  it('handles zero posts', () => {
    const xml = buildRssXml([]);
    expect(xml).toContain('</channel>');
    expect(xml).not.toContain('<item>');
  });
});
```

- [ ] **Step 2: Run to verify it fails, then implement `src/lib/rss.ts`**

```typescript
import type { Post } from '@/payload-types';

import { siteConfig } from '@/lib/site-config';

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function buildRssXml(posts: Post[]): string {
  const items = posts
    .map((post) => {
      const url = `${siteConfig.url}/blog/${post.slug}`;
      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid>${url}</guid>`,
        `      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>`,
        post.excerpt
          ? `      <description>${escapeXml(post.excerpt)}</description>`
          : '',
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    `    <title>${escapeXml(siteConfig.title)}</title>`,
    `    <link>${siteConfig.url}</link>`,
    `    <description>${escapeXml(siteConfig.description)}</description>`,
    `    <language>en</language>`,
    items,
    '  </channel>',
    '</rss>',
  ]
    .filter(Boolean)
    .join('\n');
}
```

Run `pnpm test` → PASS.

- [ ] **Step 3: Create `src/app/(site)/feed.xml/route.ts`**

```typescript
import { listPublishedPosts } from '@/lib/repositories/posts';
import { buildRssXml } from '@/lib/rss';

export const revalidate = 300;

export async function GET(): Promise<Response> {
  const posts = await listPublishedPosts();
  return new Response(buildRssXml(posts), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
```

- [ ] **Step 4: Create `src/app/sitemap.ts` and `src/app/robots.ts`**

`src/app/sitemap.ts`:

```typescript
import type { MetadataRoute } from 'next';

import { listPublishedPosts } from '@/lib/repositories/posts';
import { siteConfig } from '@/lib/site-config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let posts: Awaited<ReturnType<typeof listPublishedPosts>> = [];
  try {
    posts = await listPublishedPosts();
  } catch {
    // DB unavailable at build — ship the static entries.
  }
  return [
    { url: siteConfig.url },
    { url: `${siteConfig.url}/blog` },
    ...posts.map((post) => ({
      lastModified: post.updatedAt,
      url: `${siteConfig.url}/blog/${post.slug}`,
    })),
  ];
}
```

`src/app/robots.ts`:

```typescript
import type { MetadataRoute } from 'next';

import { siteConfig } from '@/lib/site-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ allow: '/', disallow: ['/admin'], userAgent: '*' }],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
```

- [ ] **Step 5: RSS autodiscovery**

In `src/app/(site)/layout.tsx`, add to the `metadata` export (alphabetical position — after `description`):

```tsx
  alternates: {
    types: { 'application/rss+xml': '/feed.xml' },
  },
```

(`metadataBase` from Phase 1 resolves it absolute.)

- [ ] **Step 6: Footer RSS link + test**

In `src/components/site/site-footer.tsx`, inside the `<ul>` after the external-links map, add:

```tsx
          <li>
            <a className="transition-colors hover:text-fg" href="/feed.xml">
              rss
            </a>
          </li>
```

Add to `src/components/site/site-footer.test.tsx`:

```tsx
  it('links the RSS feed internally', () => {
    render(<SiteFooter />);
    const rss = screen.getByRole('link', { name: 'rss' });
    expect(rss).toHaveAttribute('href', '/feed.xml');
    expect(rss).not.toHaveAttribute('target');
  });
```

- [ ] **Step 7: Full gate and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add src/lib/rss.ts src/lib/rss.test.ts "src/app/(site)/feed.xml/" src/app/sitemap.ts src/app/robots.ts "src/app/(site)/layout.tsx" src/components/site/site-footer.tsx src/components/site/site-footer.test.tsx
git commit -m "feat: add rss feed, sitemap, robots, and footer rss link"
```

---

### Task 8: CI build against memory MongoDB

**Files:**
- Create: `scripts/ci-build.mjs`
- Modify: `package.json` (script), `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: everything prior; mongodb-memory-server from Task 3.
- Produces: green CI on a DB-less runner; `pnpm build:ci`.

- [ ] **Step 1: Create `scripts/ci-build.mjs`**

```javascript
import { spawnSync } from 'node:child_process';

import { MongoMemoryServer } from 'mongodb-memory-server';

const mongod = await MongoMemoryServer.create();
const result = spawnSync('pnpm', ['build'], {
  env: {
    ...process.env,
    DATABASE_URL: mongod.getUri(),
    PAYLOAD_SECRET: process.env.PAYLOAD_SECRET ?? 'ci-build-secret',
  },
  stdio: 'inherit',
});
await mongod.stop();
process.exit(result.status ?? 1);
```

- [ ] **Step 2: Add script and wire CI**

`package.json` scripts: `"build:ci": "node scripts/ci-build.mjs"`.

In `.github/workflows/ci.yml`: insert a cache step before `pnpm install` and switch the build step:

```yaml
      - uses: actions/cache@v4
        with:
          path: ~/.cache/mongodb-binaries
          key: mongodb-binaries-${{ runner.os }}
```

and replace `- run: pnpm build` with `- run: pnpm build:ci`.

- [ ] **Step 3: Verify the exact CI sequence locally**

```bash
pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build:ci
```

All pass; `build:ci` prerenders `/blog` (empty DB → empty index) and the four static params return `[]` gracefully. Coverage thresholds hold.

- [ ] **Step 4: Commit**

```bash
git add scripts/ci-build.mjs package.json .github/workflows/ci.yml
git commit -m "chore: build against in-memory mongodb in CI"
```

---

## As-built amendments (execution record)

Deviations from the task snippets above, each authorized during subagent-driven execution and verified in review. The code on the branch is the source of truth.

- **Task 4 (e8f8f1a, e78b2d5):** `editorConfigFactory.default` ignores the payload config's features, so markdown fences survived `convertMarkdownToLexical` as literal paragraphs, and `stripMdxArtifacts` corrupted import/export lines inside fences. Replaced the single-pass conversion with a fence-aware pipeline: `splitFences` (CRLF-normalized first) extracts fenced blocks, prose segments go through strip+convert, fences become hand-built `type: 'block'` code nodes. See `src/lib/migration/migrate-posts.ts`.
- **Task 6 (6a1021c):** `@testing-library/user-event@14.6.1` `setup()` unconditionally replaces `navigator.clipboard` with a getter-only stub, so the CopyButton test mocks the clipboard *after* `setup()` via `Object.defineProperty` (not the brief's pre-setup `Object.assign`). `JSXConvertersFunction` required the typed-generic form with `DefaultNodeTypes | SerializedBlockNode<CodeBlockFields>` (pre-authorized).
- **Task 6 fix passes (c849bce, c3bc4c7):** JSON-LD serialization escapes `<` to prevent `</script` breakout, extracted to `serializeJsonLd` in `src/lib/json-ld.ts` with its own test file. `post-body.test.tsx` gained a code-block converter test (async-RSC rendered under `<Suspense>` with `await act(...)`, `@/lib/highlight` mocked).
- **Task 8 (bb3bbce, 312dca8, 50c56d9):** The CI coverage gate exposed a pre-existing branch-coverage gap (73.21% vs 90%) accumulated across Tasks 5–7; closed with targeted tests (92.85%), no threshold changes. `scripts/ci-build.mjs` imports are sorted per repo lint rules and `mongod.stop()` runs in a `try/finally`; the workflow cache key is `mongodb-binaries-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}` with a `restore-keys` prefix fallback.
