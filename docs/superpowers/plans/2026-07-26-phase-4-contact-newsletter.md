# Phase 4: Contact + Newsletter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `/contact` page (form + services dialog + deep links), the collect-only newsletter flow (subscribe → confirm → unsubscribe), the email/anti-spam infrastructure behind both, and the Phase-4-tagged backlog items (posts-repository logging, shadcn adoption, ButtonLink extraction).

**Architecture:** Payload collections (`contact-submissions`, `subscribers`) written through repositories from Server Actions; Zod schemas shared client/server (React Hook Form + zodResolver on the client, `safeParse` in the action); nodemailer → SES SMTP behind a transport module that degrades to a logged JSON transport without creds; Cloudflare Turnstile verified server-side with official test keys as the no-config fallback; shadcn adopted as the copy-in Radix pattern (token-themed `components/ui/dialog.tsx`), not the CLI.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4 tokens, Payload 3, zod 4, react-hook-form + @hookform/resolvers, @radix-ui/react-dialog, @marsidev/react-turnstile, nodemailer, Vitest + RTL + mongodb-memory-server.

## Global Constraints

- TypeScript strict; no `any`. `interface` for object shapes. Named exports everywhere EXCEPT Next.js page/config default exports.
- Files with `'use server'` may export ONLY async functions — shared types live in `src/lib/actions/types.ts` (no directive).
- Every Server Action returns `ActionResult` = `{ success: boolean; error?: string }`. Never throw to the client.
- Email and Turnstile failures must NEVER lose a stored submission/subscriber: store first, email after, log email failures, still return success (spec §6/§7).
- Honeypot field is named `website`; a filled honeypot returns `{ success: true }` WITHOUT storing anything (silent discard — never reveal detection).
- Newsletter responses are uniform regardless of prior subscription state (no subscriber enumeration).
- Turnstile server verification fails CLOSED (network/HTTP error → not verified).
- Env var names, exact: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `CONTACT_TO`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`. Never commit real values.
- Design tokens only (`bg-canvas`, `bg-surface`, `border-edge`, `text-fg`, `text-fg-muted`, `text-phosphor`, `border-phosphor`, `font-mono`); opacity modifiers on tokens (e.g. `bg-canvas/80`) are allowed; no raw hex.
- Terminal copy voice: `$ <command>` prompts, `# comment` lines, lowercase labels.
- After changing collections run `pnpm generate:types` and commit the regenerated `src/payload-types.ts` in the same commit.
- `pnpm build:ci` flake protocol: if it fails, run it ONCE more; a pass on either invocation is a green gate; two consecutive failures = report BLOCKED (do not debug the build system).
- NEVER touch `.claude/`, settings, or permission files. If a command is permission-denied, report BLOCKED.
- Every commit ends with the two trailers:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01VWHYP1WscXnehjiTacQrCA`

## File Structure

```
src/lib/validation/contact.ts        reasons enum + labels + contactSchema (Task 1)
src/lib/validation/newsletter.ts     newsletterSchema (Task 1)
src/lib/newsletter-tokens.ts         generateToken/hashToken (Task 1)
src/collections/contact-submissions.ts, subscribers.ts  (Task 2)
src/lib/repositories/submissions.ts  createSubmission (Task 3)
src/lib/repositories/subscribers.ts  upsert/confirm/unsubscribe (Task 3)
src/lib/repositories/services.ts     + findServiceIdsBySlugs (Task 3)
src/lib/repositories/posts.ts        logging consolidation (Task 3)
src/lib/email/transport.ts, templates.ts   (Task 4)
src/lib/turnstile.ts                 site key + server verify (Task 4)
src/lib/actions/types.ts, contact.ts, newsletter.ts   (Task 5)
src/components/ui/dialog.tsx, button-link.tsx         (Task 6)
src/components/contact/contact-form.tsx + /contact page (Task 7)
src/components/newsletter/newsletter-form.tsx,
src/components/home/newsletter-beat.tsx,
src/app/(site)/newsletter/confirm/page.tsx, unsubscribe/page.tsx (Task 8)
```

---

### Task 1: Validation schemas + newsletter tokens

**Files:**
- Create: `src/lib/validation/contact.ts`, `src/lib/validation/newsletter.ts`, `src/lib/newsletter-tokens.ts`
- Test: `src/lib/validation/contact.test.ts`, `src/lib/validation/newsletter.test.ts`, `src/lib/newsletter-tokens.test.ts`

**Interfaces:**
- Consumes: nothing (pure modules).
- Produces: `CONTACT_REASONS`, `ContactReason`, `CONTACT_REASON_LABELS`, `contactSchema`, `ContactFormValues`; `newsletterSchema`, `NewsletterFormValues`; `generateToken(): GeneratedToken`, `hashToken(raw: string): string`.

- [ ] **Step 1: Install zod**

```bash
pnpm add zod@^4
```

- [ ] **Step 2: Write the failing tests**

`src/lib/validation/contact.test.ts`:

```typescript
import { contactSchema } from '@/lib/validation/contact';

const valid = {
  email: 'a@b.com',
  message: 'I need help with an AI enablement rollout.',
  name: 'Ada',
  reason: 'general' as const,
  requestedServices: [],
  turnstileToken: 'tok',
  website: '',
};

describe('contactSchema', () => {
  it('accepts a valid submission', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an invalid email and a short message', () => {
    expect(contactSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(
      false,
    );
    expect(contactSchema.safeParse({ ...valid, message: 'hi' }).success).toBe(
      false,
    );
  });

  it('requires at least one service when reason is services', () => {
    const result = contactSchema.safeParse({ ...valid, reason: 'services' });
    expect(result.success).toBe(false);
    const ok = contactSchema.safeParse({
      ...valid,
      reason: 'services',
      requestedServices: ['ai-enablement'],
    });
    expect(ok.success).toBe(true);
  });

  it('rejects a filled honeypot', () => {
    expect(
      contactSchema.safeParse({ ...valid, website: 'spam.example' }).success,
    ).toBe(false);
  });
});
```

`src/lib/validation/newsletter.test.ts`:

```typescript
import { newsletterSchema } from '@/lib/validation/newsletter';

describe('newsletterSchema', () => {
  it('accepts a valid signup and rejects a bad email', () => {
    const valid = { email: 'a@b.com', turnstileToken: 'tok', website: '' };
    expect(newsletterSchema.safeParse(valid).success).toBe(true);
    expect(
      newsletterSchema.safeParse({ ...valid, email: 'nope' }).success,
    ).toBe(false);
  });
});
```

`src/lib/newsletter-tokens.test.ts`:

```typescript
import { generateToken, hashToken } from '@/lib/newsletter-tokens';

describe('newsletter tokens', () => {
  it('generates a 64-hex raw token whose hash matches hashToken', () => {
    const token = generateToken();
    expect(token.raw).toMatch(/^[0-9a-f]{64}$/);
    expect(token.hash).toBe(hashToken(token.raw));
    expect(token.hash).not.toBe(token.raw);
  });

  it('is unique per call and deterministic per input', () => {
    expect(generateToken().raw).not.toBe(generateToken().raw);
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });
});
```

Run: `pnpm exec vitest run src/lib/validation src/lib/newsletter-tokens.test.ts` — Expected: FAIL (modules missing).

- [ ] **Step 3: Implement `src/lib/validation/contact.ts`**

```typescript
import { z } from 'zod';

export const CONTACT_REASONS = [
  'services',
  'general',
  'speaking-writing',
  'mentoring',
  'other',
] as const;

export type ContactReason = (typeof CONTACT_REASONS)[number];

export const CONTACT_REASON_LABELS: Record<ContactReason, string> = {
  general: 'general inquiry',
  mentoring: 'mentoring',
  other: 'other',
  services: 'request services',
  'speaking-writing': 'speaking & writing',
};

export const contactSchema = z
  .object({
    email: z.email('enter a valid email').max(254),
    message: z
      .string()
      .trim()
      .min(10, 'a little more detail — 10 characters minimum')
      .max(5000, 'keep it under 5000 characters'),
    name: z.string().trim().min(1, 'name is required').max(120),
    reason: z.enum(CONTACT_REASONS),
    requestedServices: z.array(z.string().min(1)).max(5),
    turnstileToken: z
      .string()
      .min(1, 'verification incomplete — give it a beat and retry'),
    website: z.literal(''),
  })
  .superRefine((data, ctx) => {
    if (data.reason === 'services' && data.requestedServices.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'select at least one service',
        path: ['requestedServices'],
      });
    }
  });

export type ContactFormValues = z.infer<typeof contactSchema>;
```

- [ ] **Step 4: Implement `src/lib/validation/newsletter.ts`**

```typescript
import { z } from 'zod';

export const newsletterSchema = z.object({
  email: z.email('enter a valid email').max(254),
  turnstileToken: z
    .string()
    .min(1, 'verification incomplete — give it a beat and retry'),
  website: z.literal(''),
});

export type NewsletterFormValues = z.infer<typeof newsletterSchema>;
```

- [ ] **Step 5: Implement `src/lib/newsletter-tokens.ts`**

```typescript
import { createHash, randomBytes } from 'node:crypto';

export interface GeneratedToken {
  hash: string;
  raw: string;
}

/** Hash stored in the DB; the raw token only ever travels in the email link. */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateToken(): GeneratedToken {
  const raw = randomBytes(32).toString('hex');
  return { hash: hashToken(raw), raw };
}
```

- [ ] **Step 6: Run tests, lint, typecheck; commit**

```bash
pnpm exec vitest run src/lib/validation src/lib/newsletter-tokens.test.ts
pnpm lint && pnpm typecheck
git add src/lib/validation src/lib/newsletter-tokens.ts src/lib/newsletter-tokens.test.ts package.json pnpm-lock.yaml
git commit -m "feat: contact/newsletter validation schemas and confirm tokens"
```

---

### Task 2: `contact-submissions` + `subscribers` collections

**Files:**
- Create: `src/collections/contact-submissions.ts`, `src/collections/subscribers.ts`
- Modify: `src/payload.config.ts` (register both), `src/payload-types.ts` (regenerated)

**Interfaces:**
- Consumes: `CONTACT_REASONS`, `CONTACT_REASON_LABELS` (Task 1); existing `services` collection (relationship target).
- Produces: collections `contact-submissions` and `subscribers`; generated types `ContactSubmission`, `Subscriber`.

- [ ] **Step 1: Create `src/collections/contact-submissions.ts`**

Follow the existing config style in `src/collections/services.ts` (named export, alphabetized keys).

```typescript
import type { CollectionConfig } from 'payload';

import {
  CONTACT_REASON_LABELS,
  CONTACT_REASONS,
} from '@/lib/validation/contact';

export const ContactSubmissions: CollectionConfig = {
  access: {
    create: () => false,
    delete: ({ req }) => Boolean(req.user),
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
  },
  admin: {
    defaultColumns: ['name', 'email', 'reason', 'status', 'createdAt'],
    useAsTitle: 'name',
  },
  fields: [
    { admin: { readOnly: true }, name: 'name', required: true, type: 'text' },
    { admin: { readOnly: true }, name: 'email', required: true, type: 'email' },
    {
      admin: { readOnly: true },
      name: 'reason',
      options: CONTACT_REASONS.map((reason) => ({
        label: CONTACT_REASON_LABELS[reason],
        value: reason,
      })),
      required: true,
      type: 'select',
    },
    {
      admin: { readOnly: true },
      hasMany: true,
      name: 'requestedServices',
      relationTo: 'services',
      type: 'relationship',
    },
    {
      admin: { readOnly: true },
      name: 'message',
      required: true,
      type: 'textarea',
    },
    {
      defaultValue: 'new',
      name: 'status',
      options: [
        { label: 'new', value: 'new' },
        { label: 'replied', value: 'replied' },
        { label: 'archived', value: 'archived' },
      ],
      required: true,
      type: 'select',
    },
  ],
  slug: 'contact-submissions',
};
```

(`status` is the one field WITHOUT `admin.readOnly` — spec: "Read-only in admin except status".)

- [ ] **Step 2: Create `src/collections/subscribers.ts`**

```typescript
import type { CollectionConfig } from 'payload';

export const Subscribers: CollectionConfig = {
  access: {
    create: () => false,
    delete: ({ req }) => Boolean(req.user),
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
  },
  admin: {
    defaultColumns: ['email', 'status', 'confirmedAt'],
    useAsTitle: 'email',
  },
  fields: [
    { index: true, name: 'email', required: true, type: 'email', unique: true },
    {
      defaultValue: 'pending',
      name: 'status',
      options: [
        { label: 'pending', value: 'pending' },
        { label: 'active', value: 'active' },
        { label: 'unsubscribed', value: 'unsubscribed' },
      ],
      required: true,
      type: 'select',
    },
    { admin: { hidden: true }, index: true, name: 'confirmToken', type: 'text' },
    { admin: { readOnly: true }, name: 'confirmedAt', type: 'date' },
    { admin: { readOnly: true }, name: 'unsubscribedAt', type: 'date' },
  ],
  slug: 'subscribers',
};
```

- [ ] **Step 3: Register in `src/payload.config.ts`**

Add both imports and extend the array (order): `[Users, Media, Posts, Services, ContactSubmissions, Subscribers]`.

- [ ] **Step 4: Regenerate types**

```bash
pnpm generate:types
```

Expected: `src/payload-types.ts` gains `ContactSubmission` and `Subscriber` interfaces. Inspect: `ContactSubmission.requestedServices` should be a nullable array of string-or-Service; `Subscriber.status` a union of the three literals.

- [ ] **Step 5: Gate and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/collections/contact-submissions.ts src/collections/subscribers.ts src/payload.config.ts src/payload-types.ts
git commit -m "feat: contact-submissions and subscribers collections"
```

---

### Task 3: Submissions + subscribers repositories, posts logging consolidation

**Files:**
- Create: `src/lib/repositories/submissions.ts`, `src/lib/repositories/subscribers.ts`
- Modify: `src/lib/repositories/services.ts` (add `findServiceIdsBySlugs`), `src/lib/repositories/posts.ts` (logging), `src/app/(site)/page.tsx` (drop ad-hoc catch), `src/app/sitemap.ts` (drop ad-hoc catch)
- Test: `src/lib/repositories/subscribers.int.test.ts`, `src/lib/repositories/submissions.int.test.ts`

**Interfaces:**
- Consumes: `generateToken`/`hashToken` (Task 1), `ContactReason` (Task 1), generated `ContactSubmission`/`Subscriber` (Task 2), `createTestPayload` from `src/test/payload-harness.ts`, `seedServices` from `src/lib/services-seed.ts`.
- Produces: `createSubmission(input: CreateSubmissionInput): Promise<ContactSubmission>`; `upsertPendingSubscriber(email: string): Promise<UpsertPendingResult>`; `confirmSubscriber(rawToken: string): Promise<boolean>`; `unsubscribeSubscriber(rawToken: string): Promise<boolean>`; `findServiceIdsBySlugs(slugs: string[]): Promise<string[]>`.

- [ ] **Step 1: Write the failing int tests**

`src/lib/repositories/subscribers.int.test.ts` (harness pattern identical to `services.int.test.ts`):

```typescript
// @vitest-environment node
import type { Payload } from 'payload';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestPayload } from '@/test/payload-harness';

let payload: Payload;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ payload, teardown } = await createTestPayload());
}, 120_000);

afterAll(async () => {
  await teardown();
});

describe('subscribers repository', () => {
  it('creates a pending subscriber with a confirmable token', async () => {
    const { confirmSubscriber, upsertPendingSubscriber } = await import(
      '@/lib/repositories/subscribers'
    );
    const result = await upsertPendingSubscriber('One@Example.com');
    expect(result.alreadyActive).toBe(false);
    expect(result.rawToken).toMatch(/^[0-9a-f]{64}$/);
    const found = await payload.find({
      collection: 'subscribers',
      where: { email: { equals: 'one@example.com' } },
    });
    expect(found.docs[0]?.status).toBe('pending');
    expect(found.docs[0]?.confirmToken).not.toBe(result.rawToken);
    expect(await confirmSubscriber(result.rawToken ?? '')).toBe(true);
    const confirmed = await payload.find({
      collection: 'subscribers',
      where: { email: { equals: 'one@example.com' } },
    });
    expect(confirmed.docs[0]?.status).toBe('active');
    expect(confirmed.docs[0]?.confirmedAt).toBeTruthy();
  });

  it('reports an active subscriber without issuing a new token', async () => {
    const { upsertPendingSubscriber } = await import(
      '@/lib/repositories/subscribers'
    );
    const result = await upsertPendingSubscriber('one@example.com');
    expect(result).toEqual({ alreadyActive: true, rawToken: null });
  });

  it('confirm is idempotent and rejects unknown tokens', async () => {
    const { confirmSubscriber } = await import(
      '@/lib/repositories/subscribers'
    );
    expect(await confirmSubscriber('0'.repeat(64))).toBe(false);
  });

  it('unsubscribes by token and allows re-subscribing', async () => {
    const {
      unsubscribeSubscriber,
      upsertPendingSubscriber,
    } = await import('@/lib/repositories/subscribers');
    const fresh = await upsertPendingSubscriber('two@example.com');
    expect(await unsubscribeSubscriber(fresh.rawToken ?? '')).toBe(true);
    const gone = await payload.find({
      collection: 'subscribers',
      where: { email: { equals: 'two@example.com' } },
    });
    expect(gone.docs[0]?.status).toBe('unsubscribed');
    expect(gone.docs[0]?.unsubscribedAt).toBeTruthy();
    const again = await upsertPendingSubscriber('two@example.com');
    expect(again.alreadyActive).toBe(false);
    expect(again.rawToken).toMatch(/^[0-9a-f]{64}$/);
    expect(await unsubscribeSubscriber('0'.repeat(64))).toBe(false);
  });
});
```

`src/lib/repositories/submissions.int.test.ts`:

```typescript
// @vitest-environment node
import type { Payload } from 'payload';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { seedServices } from '@/lib/services-seed';
import { createTestPayload } from '@/test/payload-harness';

let payload: Payload;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ payload, teardown } = await createTestPayload());
  await seedServices(payload);
}, 120_000);

afterAll(async () => {
  await teardown();
});

describe('submissions repository', () => {
  it('resolves service slugs to ids, ignoring unknown slugs', async () => {
    const { findServiceIdsBySlugs } = await import(
      '@/lib/repositories/services'
    );
    const ids = await findServiceIdsBySlugs(['ai-enablement', 'nope']);
    expect(ids).toHaveLength(1);
    expect(await findServiceIdsBySlugs([])).toEqual([]);
  });

  it('stores a submission with defaulted status new', async () => {
    const { findServiceIdsBySlugs } = await import(
      '@/lib/repositories/services'
    );
    const { createSubmission } = await import(
      '@/lib/repositories/submissions'
    );
    const serviceIds = await findServiceIdsBySlugs(['ai-enablement']);
    const created = await createSubmission({
      email: 'ada@example.com',
      message: 'Help my team adopt Claude Code end to end.',
      name: 'Ada',
      reason: 'services',
      requestedServiceIds: serviceIds,
    });
    expect(created.status).toBe('new');
    expect(created.reason).toBe('services');
    expect(created.requestedServices).toHaveLength(1);
  });
});
```

Run: `pnpm exec vitest run src/lib/repositories/subscribers.int.test.ts src/lib/repositories/submissions.int.test.ts` — Expected: FAIL (modules missing).

- [ ] **Step 2: Implement `src/lib/repositories/submissions.ts`**

```typescript
import config from '@payload-config';
import { getPayload } from 'payload';

import type { ContactSubmission } from '@/payload-types';

import type { ContactReason } from '@/lib/validation/contact';

export interface CreateSubmissionInput {
  email: string;
  message: string;
  name: string;
  reason: ContactReason;
  requestedServiceIds: string[];
}

/** Mutation — the Server Action is the gatekeeper, so access is overridden. */
export async function createSubmission(
  input: CreateSubmissionInput,
): Promise<ContactSubmission> {
  const payload = await getPayload({ config });
  return payload.create({
    collection: 'contact-submissions',
    data: {
      email: input.email,
      message: input.message,
      name: input.name,
      reason: input.reason,
      requestedServices: input.requestedServiceIds,
    },
    overrideAccess: true,
  });
}
```

- [ ] **Step 3: Implement `src/lib/repositories/subscribers.ts`**

```typescript
import config from '@payload-config';
import { getPayload } from 'payload';

import type { Subscriber } from '@/payload-types';

import { generateToken, hashToken } from '@/lib/newsletter-tokens';

export interface UpsertPendingResult {
  alreadyActive: boolean;
  rawToken: null | string;
}

async function client() {
  return getPayload({ config });
}

async function findByEmail(email: string): Promise<null | Subscriber> {
  const payload = await client();
  const result = await payload.find({
    collection: 'subscribers',
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: email } },
  });
  return result.docs[0] ?? null;
}

async function findByToken(rawToken: string): Promise<null | Subscriber> {
  const payload = await client();
  const result = await payload.find({
    collection: 'subscribers',
    limit: 1,
    overrideAccess: true,
    where: { confirmToken: { equals: hashToken(rawToken) } },
  });
  return result.docs[0] ?? null;
}

/**
 * Creates or re-arms a pending subscriber and returns the raw token to email.
 * Active subscribers keep their existing token (used for unsubscribe links).
 */
export async function upsertPendingSubscriber(
  email: string,
): Promise<UpsertPendingResult> {
  const normalized = email.trim().toLowerCase();
  const payload = await client();
  const existing = await findByEmail(normalized);
  if (existing?.status === 'active') {
    return { alreadyActive: true, rawToken: null };
  }
  const token = generateToken();
  if (existing) {
    await payload.update({
      collection: 'subscribers',
      data: {
        confirmToken: token.hash,
        status: 'pending',
        unsubscribedAt: null,
      },
      id: existing.id,
      overrideAccess: true,
    });
  } else {
    await payload.create({
      collection: 'subscribers',
      data: { confirmToken: token.hash, email: normalized, status: 'pending' },
      overrideAccess: true,
    });
  }
  return { alreadyActive: false, rawToken: token.raw };
}

export async function confirmSubscriber(rawToken: string): Promise<boolean> {
  const subscriber = await findByToken(rawToken);
  if (!subscriber) {
    return false;
  }
  if (subscriber.status === 'active') {
    return true;
  }
  const payload = await client();
  await payload.update({
    collection: 'subscribers',
    data: { confirmedAt: new Date().toISOString(), status: 'active' },
    id: subscriber.id,
    overrideAccess: true,
  });
  return true;
}

export async function unsubscribeSubscriber(
  rawToken: string,
): Promise<boolean> {
  const subscriber = await findByToken(rawToken);
  if (!subscriber) {
    return false;
  }
  if (subscriber.status === 'unsubscribed') {
    return true;
  }
  const payload = await client();
  await payload.update({
    collection: 'subscribers',
    data: { status: 'unsubscribed', unsubscribedAt: new Date().toISOString() },
    id: subscriber.id,
    overrideAccess: true,
  });
  return true;
}
```

- [ ] **Step 4: Add `findServiceIdsBySlugs` to `src/lib/repositories/services.ts`**

Append (reusing the file's existing `getPayload`/config imports):

```typescript
export async function findServiceIdsBySlugs(
  slugs: string[],
): Promise<string[]> {
  if (slugs.length === 0) {
    return [];
  }
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: 'services',
      limit: slugs.length,
      overrideAccess: false,
      where: { slug: { in: slugs } },
    });
    return result.docs.map((doc) => String(doc.id));
  } catch (error) {
    console.error('findServiceIdsBySlugs failed:', error);
    return [];
  }
}
```

- [ ] **Step 5: Consolidate logging into `src/lib/repositories/posts.ts`**

Wrap each function body (inside the `cache()` wrapper) in try/catch, mirroring `listServices`:

```typescript
export const listPublishedPosts = cache(async (): Promise<Post[]> => {
  try {
    const payload = await client();
    const result = await payload.find({
      collection: 'posts',
      limit: 100,
      overrideAccess: false,
      sort: '-publishedAt',
      where: { status: { equals: 'published' } },
    });
    return result.docs;
  } catch (error) {
    console.error('listPublishedPosts failed — rendering without posts:', error);
    return [];
  }
});

export const getPostBySlug = cache(
  async (slug: string): Promise<Post | null> => {
    try {
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
    } catch (error) {
      console.error(`getPostBySlug(${slug}) failed:`, error);
      return null;
    }
  },
);
```

Then update the two ad-hoc callers:
- `src/app/(site)/page.tsx` line 13 → `const posts = (await listPublishedPosts()).slice(0, 3);`
- `src/app/sitemap.ts` → replace the `let posts`/try/catch block with `const posts = await listPublishedPosts();`

(Semantics note, accepted in Phase 3 final triage: a DB failure at build now bakes empty lists instead of failing the build; ISR revalidate self-heals within 300s.)

- [ ] **Step 6: Run tests, gate, commit**

```bash
pnpm exec vitest run src/lib/repositories/subscribers.int.test.ts src/lib/repositories/submissions.int.test.ts
pnpm lint && pnpm typecheck && pnpm test
git add src/lib/repositories src/app/sitemap.ts "src/app/(site)/page.tsx"
git commit -m "feat: submissions and subscribers repositories, repository-level post logging"
```

---

### Task 4: Email transport + templates, Turnstile verify, env docs

**Files:**
- Create: `src/lib/email/transport.ts`, `src/lib/email/templates.ts`, `src/lib/turnstile.ts`
- Modify: `.env.example`
- Test: `src/lib/email/transport.test.ts`, `src/lib/email/templates.test.ts`, `src/lib/turnstile.test.ts`

**Interfaces:**
- Consumes: `siteConfig` (url), `ContactReason`/`CONTACT_REASON_LABELS` (Task 1).
- Produces: `sendEmail(input: SendEmailInput): Promise<boolean>`; `contactNotificationEmail(input: ContactNotificationInput): EmailContent`; `newsletterConfirmEmail(confirmUrl: string): EmailContent`; `turnstileSiteKey(): string`; `verifyTurnstileToken(token: string): Promise<boolean>`; `TURNSTILE_TEST_SITE_KEY`.

- [ ] **Step 1: Install nodemailer**

```bash
pnpm add nodemailer && pnpm add -D @types/nodemailer
```

- [ ] **Step 2: Write the failing tests**

`src/lib/email/transport.test.ts` (node env — add `// @vitest-environment node` docblock as line 1):

```typescript
// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('sendEmail', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('resolves true via the JSON transport when SMTP_HOST is unset', async () => {
    vi.stubEnv('SMTP_HOST', '');
    const { sendEmail } = await import('@/lib/email/transport');
    await expect(
      sendEmail({ subject: 's', text: 't', to: 'a@b.com' }),
    ).resolves.toBe(true);
  });

  it('returns false instead of throwing when the transport fails', async () => {
    vi.resetModules();
    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: () => ({
          sendMail: () => Promise.reject(new Error('smtp down')),
        }),
      },
    }));
    const { sendEmail } = await import('@/lib/email/transport');
    await expect(
      sendEmail({ subject: 's', text: 't', to: 'a@b.com' }),
    ).resolves.toBe(false);
    vi.doUnmock('nodemailer');
  });
});
```

`src/lib/email/templates.test.ts`:

```typescript
import {
  contactNotificationEmail,
  newsletterConfirmEmail,
} from '@/lib/email/templates';

describe('email templates', () => {
  it('renders the contact notification with reason label and services', () => {
    const email = contactNotificationEmail({
      email: 'ada@example.com',
      message: 'Ship it.',
      name: 'Ada',
      reason: 'services',
      serviceNames: ['AI enablement'],
    });
    expect(email.subject).toBe('[mkelley33.com] request services — Ada');
    expect(email.text).toContain('Ada <ada@example.com>');
    expect(email.text).toContain('AI enablement');
    expect(email.text).toContain('Ship it.');
  });

  it('omits the services line when none were requested', () => {
    const email = contactNotificationEmail({
      email: 'a@b.com',
      message: 'hello there world',
      name: 'B',
      reason: 'general',
      serviceNames: [],
    });
    expect(email.text).not.toContain('services:');
  });

  it('renders the confirm email around the url', () => {
    const email = newsletterConfirmEmail('https://x.test/confirm?token=abc');
    expect(email.subject).toContain('confirm');
    expect(email.text).toContain('https://x.test/confirm?token=abc');
  });
});
```

`src/lib/turnstile.test.ts` (node env docblock):

```typescript
// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { verifyTurnstileToken } from '@/lib/turnstile';

describe('verifyTurnstileToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when cloudflare reports success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      ),
    );
    await expect(verifyTurnstileToken('tok')).resolves.toBe(true);
  });

  it('fails closed on failure, non-200, and network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: false }), { status: 200 }),
      ),
    );
    await expect(verifyTurnstileToken('tok')).resolves.toBe(false);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('nope', { status: 500 })),
    );
    await expect(verifyTurnstileToken('tok')).resolves.toBe(false);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(verifyTurnstileToken('tok')).resolves.toBe(false);
  });
});
```

Run: `pnpm exec vitest run src/lib/email src/lib/turnstile.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/email/transport.ts`**

```typescript
import nodemailer from 'nodemailer';

import type { Transporter } from 'nodemailer';

export interface SendEmailInput {
  subject: string;
  text: string;
  to: string;
}

let transporter: null | Transporter<unknown> = null;

function createTransport(): Transporter<unknown> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.warn(
      'SMTP_HOST unset — email disabled, using JSON transport (logged only)',
    );
    return nodemailer.createTransport({ jsonTransport: true });
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    auth: {
      pass: process.env.SMTP_PASS ?? '',
      user: process.env.SMTP_USER ?? '',
    },
    host,
    port,
    secure: port === 465,
  });
}

/** Never throws — email failure must not break the calling flow (spec §7). */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  transporter ??= createTransport();
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? 'mkelley33.com <no-reply@mkelley33.com>',
      subject: input.subject,
      text: input.text,
      to: input.to,
    });
    return true;
  } catch (error) {
    console.error('sendEmail failed:', error);
    return false;
  }
}
```

(If `Transporter<unknown>` trips the assignability of the two transport variants under strict mode, type the variable as the union of the two concrete `Transporter<...SentMessageInfo>` types instead — do NOT use `any`.)

- [ ] **Step 4: Implement `src/lib/email/templates.ts`**

```typescript
import type { ContactReason } from '@/lib/validation/contact';

import { CONTACT_REASON_LABELS } from '@/lib/validation/contact';

export interface EmailContent {
  subject: string;
  text: string;
}

export interface ContactNotificationInput {
  email: string;
  message: string;
  name: string;
  reason: ContactReason;
  serviceNames: string[];
}

export function contactNotificationEmail(
  input: ContactNotificationInput,
): EmailContent {
  const servicesLine =
    input.serviceNames.length > 0
      ? `\nservices:  ${input.serviceNames.join(', ')}`
      : '';
  return {
    subject: `[mkelley33.com] ${CONTACT_REASON_LABELS[input.reason]} — ${input.name}`,
    text: `$ cat ./inbox/new-message\n\nfrom:      ${input.name} <${input.email}>\nreason:    ${CONTACT_REASON_LABELS[input.reason]}${servicesLine}\n\n${input.message}\n`,
  };
}

export function newsletterConfirmEmail(confirmUrl: string): EmailContent {
  return {
    subject: 'confirm your subscription — mkelley33.com',
    text: `$ subscribe --newsletter\n\nalmost there — confirm your subscription:\n\n${confirmUrl}\n\nif you didn't request this, ignore this email and nothing happens.\n`,
  };
}
```

- [ ] **Step 5: Implement `src/lib/turnstile.ts`**

```typescript
/** Cloudflare's official always-pass test keys — dev/CI fallback only. */
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';
const TURNSTILE_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function turnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? TURNSTILE_TEST_SITE_KEY;
}

/** Fails closed: any verification problem counts as not-verified. */
export async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY ?? TURNSTILE_TEST_SECRET_KEY;
  if (!process.env.TURNSTILE_SECRET_KEY) {
    console.warn(
      'TURNSTILE_SECRET_KEY unset — using Cloudflare test secret (always passes)',
    );
  }
  try {
    const response = await fetch(VERIFY_URL, {
      body: new URLSearchParams({ response: token, secret }),
      method: 'POST',
    });
    if (!response.ok) {
      console.error('turnstile verify: HTTP', response.status);
      return false;
    }
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error('turnstile verify failed:', error);
    return false;
  }
}
```

- [ ] **Step 6: Extend `.env.example`**

Append:

```bash
# Email — AWS SES SMTP (unset locally: emails are logged, not sent)
# SMTP_HOST=email-smtp.us-east-1.amazonaws.com
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# EMAIL_FROM="mkelley33.com <no-reply@mkelley33.com>"
# CONTACT_TO=me@mkelley33.com

# Cloudflare Turnstile (unset: official test keys, always pass — never in prod)
# NEXT_PUBLIC_TURNSTILE_SITE_KEY=
# TURNSTILE_SECRET_KEY=
```

- [ ] **Step 7: Run tests, gate, commit**

```bash
pnpm exec vitest run src/lib/email src/lib/turnstile.test.ts
pnpm lint && pnpm typecheck
git add src/lib/email src/lib/turnstile.ts src/lib/turnstile.test.ts .env.example package.json pnpm-lock.yaml
git commit -m "feat: email transport/templates and turnstile verification"
```

---

### Task 5: Server Actions — contact + newsletter

**Files:**
- Create: `src/lib/actions/types.ts`, `src/lib/actions/contact.ts`, `src/lib/actions/newsletter.ts`
- Test: `src/lib/actions/contact.test.ts`, `src/lib/actions/newsletter.test.ts`

**Interfaces:**
- Consumes: schemas (Task 1), `createSubmission` (Task 3), `upsertPendingSubscriber` (Task 3), `findServiceIdsBySlugs`/`listServices` (Task 3/P3), `sendEmail`/templates/`verifyTurnstileToken` (Task 4), `siteConfig.url`.
- Produces: `ActionResult`; `submitContact(input: unknown): Promise<ActionResult>`; `subscribeNewsletter(input: unknown): Promise<ActionResult>`.

- [ ] **Step 1: Create `src/lib/actions/types.ts`** (no `'use server'` — a directive file may only export async functions)

```typescript
export interface ActionResult {
  error?: string;
  success: boolean;
}
```

- [ ] **Step 2: Write the failing tests**

`src/lib/actions/contact.test.ts`:

```typescript
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { submitContact } from '@/lib/actions/contact';

vi.mock('@/lib/email/transport', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/lib/repositories/services', () => ({
  findServiceIdsBySlugs: vi.fn().mockResolvedValue(['id-1']),
  listServices: vi
    .fn()
    .mockResolvedValue([{ name: 'AI enablement', slug: 'ai-enablement' }]),
}));
vi.mock('@/lib/repositories/submissions', () => ({
  createSubmission: vi.fn().mockResolvedValue({ id: 's1', status: 'new' }),
}));
vi.mock('@/lib/turnstile', () => ({
  verifyTurnstileToken: vi.fn().mockResolvedValue(true),
}));

import { sendEmail } from '@/lib/email/transport';
import { createSubmission } from '@/lib/repositories/submissions';
import { verifyTurnstileToken } from '@/lib/turnstile';

const valid = {
  email: 'ada@example.com',
  message: 'Help my team adopt AI-assisted development.',
  name: 'Ada',
  reason: 'services',
  requestedServices: ['ai-enablement'],
  turnstileToken: 'tok',
  website: '',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('submitContact', () => {
  it('stores, emails, and succeeds on the happy path', async () => {
    await expect(submitContact(valid)).resolves.toEqual({ success: true });
    expect(createSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'services', requestedServiceIds: ['id-1'] }),
    );
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it('silently accepts a filled honeypot without storing', async () => {
    await expect(
      submitContact({ ...valid, website: 'spam.example' }),
    ).resolves.toEqual({ success: true });
    expect(createSubmission).not.toHaveBeenCalled();
    expect(verifyTurnstileToken).not.toHaveBeenCalled();
  });

  it('rejects invalid input and failed verification', async () => {
    const bad = await submitContact({ ...valid, email: 'nope' });
    expect(bad.success).toBe(false);
    vi.mocked(verifyTurnstileToken).mockResolvedValueOnce(false);
    const unverified = await submitContact(valid);
    expect(unverified.success).toBe(false);
    expect(createSubmission).not.toHaveBeenCalled();
  });

  it('still succeeds when the notification email fails', async () => {
    vi.mocked(sendEmail).mockResolvedValueOnce(false);
    await expect(submitContact(valid)).resolves.toEqual({ success: true });
    expect(createSubmission).toHaveBeenCalledOnce();
  });

  it('fails with a friendly error when storage throws', async () => {
    vi.mocked(createSubmission).mockRejectedValueOnce(new Error('db down'));
    const result = await submitContact(valid);
    expect(result.success).toBe(false);
    expect(result.error).toContain('me@mkelley33.com');
  });
});
```

`src/lib/actions/newsletter.test.ts`:

```typescript
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { subscribeNewsletter } from '@/lib/actions/newsletter';

vi.mock('@/lib/email/transport', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/lib/repositories/subscribers', () => ({
  upsertPendingSubscriber: vi
    .fn()
    .mockResolvedValue({ alreadyActive: false, rawToken: 'a'.repeat(64) }),
}));
vi.mock('@/lib/turnstile', () => ({
  verifyTurnstileToken: vi.fn().mockResolvedValue(true),
}));

import { sendEmail } from '@/lib/email/transport';
import { upsertPendingSubscriber } from '@/lib/repositories/subscribers';
import { verifyTurnstileToken } from '@/lib/turnstile';

const valid = { email: 'a@b.com', turnstileToken: 'tok', website: '' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('subscribeNewsletter', () => {
  it('stores a pending subscriber and emails the confirm link', async () => {
    await expect(subscribeNewsletter(valid)).resolves.toEqual({
      success: true,
    });
    expect(upsertPendingSubscriber).toHaveBeenCalledWith('a@b.com');
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining(
      `/newsletter/confirm?token=${'a'.repeat(64)}`,
        ),
        to: 'a@b.com',
      }),
    );
  });

  it('gives the uniform response for an already-active subscriber', async () => {
    vi.mocked(upsertPendingSubscriber).mockResolvedValueOnce({
      alreadyActive: true,
      rawToken: null,
    });
    await expect(subscribeNewsletter(valid)).resolves.toEqual({
      success: true,
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('honeypot short-circuits; invalid email and failed turnstile reject', async () => {
    await expect(
      subscribeNewsletter({ ...valid, website: 'x' }),
    ).resolves.toEqual({ success: true });
    expect(upsertPendingSubscriber).not.toHaveBeenCalled();
    expect((await subscribeNewsletter({ ...valid, email: 'no' })).success).toBe(
      false,
    );
    vi.mocked(verifyTurnstileToken).mockResolvedValueOnce(false);
    expect((await subscribeNewsletter(valid)).success).toBe(false);
  });

  it('still succeeds when the confirm email fails to send', async () => {
    vi.mocked(sendEmail).mockResolvedValueOnce(false);
    await expect(subscribeNewsletter(valid)).resolves.toEqual({
      success: true,
    });
  });
});
```

Run: `pnpm exec vitest run src/lib/actions` — Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/actions/contact.ts`**

```typescript
'use server';

import type { ActionResult } from '@/lib/actions/types';

import { contactNotificationEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/transport';
import {
  findServiceIdsBySlugs,
  listServices,
} from '@/lib/repositories/services';
import { createSubmission } from '@/lib/repositories/submissions';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { contactSchema } from '@/lib/validation/contact';

function honeypotFilled(input: unknown): boolean {
  return (
    typeof input === 'object' &&
    input !== null &&
    'website' in input &&
    Boolean((input as { website?: unknown }).website)
  );
}

export async function submitContact(input: unknown): Promise<ActionResult> {
  if (honeypotFilled(input)) {
    return { success: true };
  }
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'check the highlighted fields and retry', success: false };
  }
  const data = parsed.data;
  if (!(await verifyTurnstileToken(data.turnstileToken))) {
    return {
      error: 'verification failed — give it a beat and retry',
      success: false,
    };
  }
  try {
    const requestedServiceIds = await findServiceIdsBySlugs(
      data.requestedServices,
    );
    await createSubmission({
      email: data.email,
      message: data.message,
      name: data.name,
      reason: data.reason,
      requestedServiceIds,
    });
    const services = await listServices();
    const serviceNames = services
      .filter((service) => data.requestedServices.includes(service.slug))
      .map((service) => service.name);
    const email = contactNotificationEmail({
      email: data.email,
      message: data.message,
      name: data.name,
      reason: data.reason,
      serviceNames,
    });
    await sendEmail({ ...email, to: process.env.CONTACT_TO ?? 'me@mkelley33.com' });
    return { success: true };
  } catch (error) {
    console.error('submitContact failed:', error);
    return {
      error: 'something broke — email me directly at me@mkelley33.com',
      success: false,
    };
  }
}
```

- [ ] **Step 4: Implement `src/lib/actions/newsletter.ts`**

```typescript
'use server';

import type { ActionResult } from '@/lib/actions/types';

import { newsletterConfirmEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/transport';
import { upsertPendingSubscriber } from '@/lib/repositories/subscribers';
import { siteConfig } from '@/lib/site-config';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { newsletterSchema } from '@/lib/validation/newsletter';

function honeypotFilled(input: unknown): boolean {
  return (
    typeof input === 'object' &&
    input !== null &&
    'website' in input &&
    Boolean((input as { website?: unknown }).website)
  );
}

export async function subscribeNewsletter(
  input: unknown,
): Promise<ActionResult> {
  if (honeypotFilled(input)) {
    return { success: true };
  }
  const parsed = newsletterSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'enter a valid email', success: false };
  }
  if (!(await verifyTurnstileToken(parsed.data.turnstileToken))) {
    return {
      error: 'verification failed — give it a beat and retry',
      success: false,
    };
  }
  try {
    const result = await upsertPendingSubscriber(parsed.data.email);
    if (!result.alreadyActive && result.rawToken) {
      const confirmUrl = `${siteConfig.url}/newsletter/confirm?token=${result.rawToken}`;
      await sendEmail({
        ...newsletterConfirmEmail(confirmUrl),
        to: parsed.data.email,
      });
    }
    return { success: true };
  } catch (error) {
    console.error('subscribeNewsletter failed:', error);
    return { error: 'something broke — retry in a bit', success: false };
  }
}
```

(The duplicated `honeypotFilled` helper is deliberate: `'use server'` files cannot export non-async values, and a shared non-directive helper module for 6 lines is not worth the indirection. Reviewers: this duplication is plan-mandated.)

- [ ] **Step 5: Run tests, gate, commit**

```bash
pnpm exec vitest run src/lib/actions
pnpm lint && pnpm typecheck
git add src/lib/actions
git commit -m "feat: contact and newsletter server actions"
```

---

### Task 6: UI primitives — token-themed Dialog (shadcn pattern) + ButtonLink

**Files:**
- Create: `src/components/ui/dialog.tsx`, `src/components/ui/button-link.tsx`
- Modify: `src/components/services/service-section.tsx` (use ButtonLink), `src/components/cv/cv-document.tsx` (reuse classes constant), `src/components/home/hero.tsx` (ONLY if visual-neutral — see Step 4)
- Test: `src/components/ui/dialog.test.tsx`, `src/components/ui/button-link.test.tsx`

**Interfaces:**
- Consumes: `@radix-ui/react-dialog`.
- Produces: `Dialog`, `DialogClose`, `DialogContent`, `DialogTitle`, `DialogTrigger` re-exports/wrappers; `ButtonLink` (next/link based) and `BUTTON_LINK_CLASSES` (for non-page anchors like file downloads).

This task IS the shadcn adoption decision (deferred from Phase 1/3): we adopt the shadcn **pattern** — copy-in, Radix-primitive-based, token-themed components in `components/ui/` — NOT the shadcn CLI, whose `init` wants to own `globals.css` with its own variable scheme and would fight our `@theme inline` token setup. `cmdk` joins in Phase 5.

- [ ] **Step 1: Install the Radix primitive**

```bash
pnpm add @radix-ui/react-dialog
```

- [ ] **Step 2: Write the failing tests**

`src/components/ui/dialog.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

describe('Dialog', () => {
  it('opens from the trigger and closes from the close button', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>open picker</DialogTrigger>
        <DialogContent>
          <DialogTitle>select services</DialogTitle>
          <p>body copy</p>
          <DialogClose>done</DialogClose>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'open picker' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'select services' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'done' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

`src/components/ui/button-link.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { ButtonLink } from '@/components/ui/button-link';

describe('ButtonLink', () => {
  it('renders a styled link and merges extra classes', () => {
    render(
      <ButtonLink className="mt-5" href="/services">
        Request a quote →
      </ButtonLink>,
    );
    const link = screen.getByRole('link', { name: 'Request a quote →' });
    expect(link).toHaveAttribute('href', '/services');
    expect(link).toHaveClass('border-phosphor');
    expect(link).toHaveClass('mt-5');
  });
});
```

Run: `pnpm exec vitest run src/components/ui` — Expected: FAIL.

- [ ] **Step 3: Implement `src/components/ui/dialog.tsx`**

```tsx
'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';

import type { ComponentPropsWithoutRef } from 'react';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  children,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-canvas/80" />
      <DialogPrimitive.Content
        className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-edge bg-surface p-6 focus:outline-none"
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({
  children,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className="font-mono text-lg font-bold text-phosphor"
      {...props}
    >
      {children}
    </DialogPrimitive.Title>
  );
}
```

Note: Radix warns if `DialogContent` lacks a `Description` or `aria-describedby`; consumers should pass `aria-describedby={undefined}` when there is no description (the contact form does — see Task 7), which silences it legitimately.

- [ ] **Step 4: Implement `src/components/ui/button-link.tsx` and migrate call sites**

```tsx
import Link from 'next/link';

import type { ComponentPropsWithoutRef } from 'react';

export const BUTTON_LINK_CLASSES =
  'inline-block rounded border border-phosphor px-4 py-2 font-mono text-sm text-phosphor transition-colors hover:bg-phosphor hover:text-canvas';

export function ButtonLink({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link
      className={
        className ? `${BUTTON_LINK_CLASSES} ${className}` : BUTTON_LINK_CLASSES
      }
      {...props}
    />
  );
}
```

Migrations:
1. `src/components/services/service-section.tsx` — replace the CTA `<Link className="mt-5 inline-block rounded border border-phosphor px-4 py-2 font-mono text-sm text-phosphor transition-colors hover:bg-phosphor hover:text-canvas" …>` with `<ButtonLink className="mt-5" href={…}>Request a quote →</ButtonLink>` (exact class match — visual no-op).
2. `src/components/cv/cv-document.tsx` — the download button is a plain `<a download>` to a FILE, where next/link is wrong (prefetching a PDF). Keep the `<a>` but replace its class string with `` className={`${BUTTON_LINK_CLASSES} mt-5 print:hidden`} `` and import the constant.
3. `src/components/home/hero.tsx` — its CTA classes (`rounded border border-phosphor px-4 py-2 text-phosphor …`) LACK `inline-block font-mono text-sm`. Read the surrounding JSX: migrate to ButtonLink ONLY if the CTA already sits in a `font-mono text-sm` context and a flex container (making `inline-block`/`font-mono`/`text-sm` no-ops). If not visual-neutral, leave hero unchanged and note it in your report — do not eyeball-tune.

- [ ] **Step 5: Run affected tests, gate, commit**

```bash
pnpm exec vitest run src/components/ui src/components/services src/components/cv src/components/home/hero.test.tsx
pnpm lint && pnpm typecheck
git add src/components/ui src/components/services/service-section.tsx src/components/cv/cv-document.tsx src/components/home/hero.tsx package.json pnpm-lock.yaml
git commit -m "feat: token-themed dialog and button-link ui primitives"
```

---

### Task 7: Contact page + form (dialog, chips, deep links, Turnstile)

**Files:**
- Create: `src/app/(site)/contact/page.tsx`, `src/components/contact/contact-form.tsx`
- Modify: `src/app/sitemap.ts` (add `/contact`)
- Test: `src/components/contact/contact-form.test.tsx`

**Interfaces:**
- Consumes: `contactSchema`/`ContactFormValues`/`CONTACT_REASONS`/`CONTACT_REASON_LABELS` (Task 1), `submitContact` + `ActionResult` (Task 5), Dialog primitives (Task 6), `listServices` (P3), `turnstileSiteKey` (Task 4).
- Produces: `/contact` route (static + ISR, deep-linkable via `?reason=&service=`); `ContactForm({ services: ContactServiceOption[] })`; `ContactServiceOption { name: string; slug: string }`.

- [ ] **Step 1: Install form deps**

```bash
pnpm add react-hook-form @hookform/resolvers @marsidev/react-turnstile
```

- [ ] **Step 2: Write the failing tests**

`src/components/contact/contact-form.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { ContactForm } from '@/components/contact/contact-form';
import { submitContact } from '@/lib/actions/contact';

const searchParams = { value: new URLSearchParams() };

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams.value,
}));
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess }: { onSuccess?: (token: string) => void }) => (
    <button onClick={() => onSuccess?.('test-token')} type="button">
      solve turnstile
    </button>
  ),
}));
vi.mock('@/lib/actions/contact', () => ({
  submitContact: vi.fn().mockResolvedValue({ success: true }),
}));

const services = [
  { name: 'AI enablement', slug: 'ai-enablement' },
  { name: 'Product development', slug: 'product-dev' },
];

beforeEach(() => {
  vi.clearAllMocks();
  searchParams.value = new URLSearchParams();
});

describe('ContactForm', () => {
  it('renders the core fields and no services picker for general reason', () => {
    render(<ContactForm services={services} />);
    expect(screen.getByLabelText('name')).toBeInTheDocument();
    expect(screen.getByLabelText('email')).toBeInTheDocument();
    expect(screen.getByLabelText('reason')).toHaveValue('general');
    expect(screen.getByLabelText('message')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /select services/ }),
    ).not.toBeInTheDocument();
  });

  it('shows field errors on empty submit', async () => {
    const user = userEvent.setup();
    render(<ContactForm services={services} />);
    await user.click(screen.getByRole('button', { name: /send-message/ }));
    expect(await screen.findByText('name is required')).toBeInTheDocument();
    expect(submitContact).not.toHaveBeenCalled();
  });

  it('picks services in the dialog and renders removable chips', async () => {
    const user = userEvent.setup();
    render(<ContactForm services={services} />);
    await user.selectOptions(screen.getByLabelText('reason'), 'services');
    await user.click(screen.getByRole('button', { name: /select services/ }));
    await user.click(screen.getByRole('checkbox', { name: 'AI enablement' }));
    await user.click(screen.getByRole('button', { name: 'done' }));
    expect(screen.getByText('AI enablement')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'remove AI enablement' }),
    );
    expect(screen.queryByText('AI enablement')).not.toBeInTheDocument();
  });

  it('submits the happy path and shows the queued confirmation', async () => {
    const user = userEvent.setup();
    render(<ContactForm services={services} />);
    await user.type(screen.getByLabelText('name'), 'Ada');
    await user.type(screen.getByLabelText('email'), 'ada@example.com');
    await user.type(
      screen.getByLabelText('message'),
      'Help my team adopt AI-assisted development.',
    );
    await user.click(screen.getByRole('button', { name: 'solve turnstile' }));
    await user.click(screen.getByRole('button', { name: /send-message/ }));
    expect(await screen.findByText(/message queued/)).toBeInTheDocument();
    expect(submitContact).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ada@example.com',
        turnstileToken: 'test-token',
      }),
    );
  });

  it('pre-selects reason and service from the deep link', () => {
    searchParams.value = new URLSearchParams(
      'reason=services&service=ai-enablement',
    );
    render(<ContactForm services={services} />);
    expect(screen.getByLabelText('reason')).toHaveValue('services');
    expect(screen.getByText('AI enablement')).toBeInTheDocument();
  });

  it('surfaces a server error without clearing the form', async () => {
    vi.mocked(submitContact).mockResolvedValueOnce({
      error: 'verification failed — give it a beat and retry',
      success: false,
    });
    const user = userEvent.setup();
    render(<ContactForm services={services} />);
    await user.type(screen.getByLabelText('name'), 'Ada');
    await user.type(screen.getByLabelText('email'), 'ada@example.com');
    await user.type(
      screen.getByLabelText('message'),
      'Help my team adopt AI-assisted development.',
    );
    await user.click(screen.getByRole('button', { name: 'solve turnstile' }));
    await user.click(screen.getByRole('button', { name: /send-message/ }));
    expect(
      await screen.findByText(/verification failed/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('name')).toHaveValue('Ada');
  });
});
```

Run: `pnpm exec vitest run src/components/contact` — Expected: FAIL.

- [ ] **Step 3: Implement `src/components/contact/contact-form.tsx`**

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Turnstile } from '@marsidev/react-turnstile';
import { useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import type { ContactFormValues, ContactReason } from '@/lib/validation/contact';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { submitContact } from '@/lib/actions/contact';
import { turnstileSiteKey } from '@/lib/turnstile';
import {
  CONTACT_REASON_LABELS,
  CONTACT_REASONS,
  contactSchema,
} from '@/lib/validation/contact';

export interface ContactServiceOption {
  name: string;
  slug: string;
}

const INPUT_CLASSES =
  'w-full rounded border border-edge bg-surface px-3 py-2 font-mono text-sm text-fg focus:border-phosphor focus:outline-none';

function isContactReason(value: null | string): value is ContactReason {
  return CONTACT_REASONS.includes(value as ContactReason);
}

export function ContactForm({
  services,
}: {
  services: ContactServiceOption[];
}) {
  const searchParams = useSearchParams();
  const validSlugs = new Set(services.map((service) => service.slug));
  const reasonParam = searchParams.get('reason');
  const initialServices = searchParams
    .getAll('service')
    .filter((slug) => validSlugs.has(slug));
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<null | string>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<ContactFormValues>({
    defaultValues: {
      email: '',
      message: '',
      name: '',
      reason: isContactReason(reasonParam) ? reasonParam : 'general',
      requestedServices: initialServices,
      turnstileToken: '',
      website: '',
    },
    resolver: zodResolver(contactSchema),
  });
  const reason = form.watch('reason');
  const selectedSlugs = form.watch('requestedServices');
  const errors = form.formState.errors;

  function toggleService(slug: string) {
    const next = selectedSlugs.includes(slug)
      ? selectedSlugs.filter((current) => current !== slug)
      : [...selectedSlugs, slug];
    form.setValue('requestedServices', next, { shouldValidate: true });
  }

  function onSubmit(values: ContactFormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await submitContact(values);
      if (result.success) {
        setSubmitted(true);
      } else {
        setServerError(result.error ?? 'something broke — retry in a bit');
      }
    });
  }

  if (submitted) {
    return (
      <div role="status">
        <p className="font-mono text-sm text-fg-muted">
          <span className="text-phosphor">$</span> ./send-message
        </p>
        <p className="mt-2 font-mono text-lg text-phosphor">
          message queued ✓
        </p>
        <p className="mt-2 text-sm text-fg-muted">
          I read everything and reply within a couple of days.
        </p>
      </div>
    );
  }

  return (
    <form
      className="max-w-xl space-y-5"
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div>
        <label className="font-mono text-sm text-fg" htmlFor="contact-name">
          name
        </label>
        <input
          aria-describedby={errors.name ? 'contact-name-error' : undefined}
          aria-invalid={Boolean(errors.name)}
          autoComplete="name"
          className={`mt-1 ${INPUT_CLASSES}`}
          id="contact-name"
          type="text"
          {...form.register('name')}
        />
        {errors.name ? (
          <p
            className="mt-1 font-mono text-xs text-fg-muted"
            id="contact-name-error"
          >
            # {errors.name.message}
          </p>
        ) : null}
      </div>
      <div>
        <label className="font-mono text-sm text-fg" htmlFor="contact-email">
          email
        </label>
        <input
          aria-describedby={errors.email ? 'contact-email-error' : undefined}
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          className={`mt-1 ${INPUT_CLASSES}`}
          id="contact-email"
          type="email"
          {...form.register('email')}
        />
        {errors.email ? (
          <p
            className="mt-1 font-mono text-xs text-fg-muted"
            id="contact-email-error"
          >
            # {errors.email.message}
          </p>
        ) : null}
      </div>
      <div>
        <label className="font-mono text-sm text-fg" htmlFor="contact-reason">
          reason
        </label>
        <select
          className={`mt-1 ${INPUT_CLASSES}`}
          id="contact-reason"
          {...form.register('reason')}
        >
          {CONTACT_REASONS.map((value) => (
            <option key={value} value={value}>
              {CONTACT_REASON_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      {reason === 'services' ? (
        <div>
          <Dialog>
            <DialogTrigger className="rounded border border-edge px-3 py-2 font-mono text-sm text-fg transition-colors hover:border-phosphor">
              select services…
            </DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogTitle>select services</DialogTitle>
              <ul className="mt-4 space-y-3">
                {services.map((service) => (
                  <li key={service.slug}>
                    <label className="flex items-center gap-3 font-mono text-sm text-fg">
                      <input
                        checked={selectedSlugs.includes(service.slug)}
                        className="size-4 accent-(--accent)"
                        onChange={() => toggleService(service.slug)}
                        type="checkbox"
                      />
                      {service.name}
                    </label>
                  </li>
                ))}
              </ul>
              <DialogClose className="mt-6 rounded border border-phosphor px-4 py-2 font-mono text-sm text-phosphor transition-colors hover:bg-phosphor hover:text-canvas">
                done
              </DialogClose>
            </DialogContent>
          </Dialog>
          {selectedSlugs.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {services
                .filter((service) => selectedSlugs.includes(service.slug))
                .map((service) => (
                  <li
                    className="flex items-center gap-2 rounded border border-edge bg-surface px-2 py-1 font-mono text-xs text-fg"
                    key={service.slug}
                  >
                    {service.name}
                    <button
                      aria-label={`remove ${service.name}`}
                      className="text-fg-muted transition-colors hover:text-phosphor"
                      onClick={() => toggleService(service.slug)}
                      type="button"
                    >
                      ×
                    </button>
                  </li>
                ))}
            </ul>
          ) : null}
          {errors.requestedServices ? (
            <p className="mt-1 font-mono text-xs text-fg-muted">
              # {errors.requestedServices.message}
            </p>
          ) : null}
        </div>
      ) : null}
      <div>
        <label className="font-mono text-sm text-fg" htmlFor="contact-message">
          message
        </label>
        <textarea
          aria-describedby={
            errors.message ? 'contact-message-error' : undefined
          }
          aria-invalid={Boolean(errors.message)}
          className={`mt-1 min-h-32 ${INPUT_CLASSES}`}
          id="contact-message"
          {...form.register('message')}
        />
        {errors.message ? (
          <p
            className="mt-1 font-mono text-xs text-fg-muted"
            id="contact-message-error"
          >
            # {errors.message.message}
          </p>
        ) : null}
      </div>
      <div className="hidden">
        <label htmlFor="contact-website">website</label>
        <input
          autoComplete="off"
          id="contact-website"
          tabIndex={-1}
          type="text"
          {...form.register('website')}
        />
      </div>
      <Turnstile
        onSuccess={(token) =>
          form.setValue('turnstileToken', token, { shouldValidate: true })
        }
        siteKey={turnstileSiteKey()}
      />
      {errors.turnstileToken ? (
        <p className="font-mono text-xs text-fg-muted">
          # {errors.turnstileToken.message}
        </p>
      ) : null}
      {serverError ? (
        <p className="font-mono text-sm text-fg-muted" role="alert">
          # {serverError}
        </p>
      ) : null}
      <button
        className="rounded border border-phosphor px-4 py-2 font-mono text-sm text-phosphor transition-colors hover:bg-phosphor hover:text-canvas disabled:opacity-50"
        disabled={isPending}
        type="submit"
      >
        {isPending ? 'sending…' : '$ ./send-message'}
      </button>
    </form>
  );
}
```

(`accent-(--accent)` is Tailwind 4 arbitrary-property shorthand for the checkbox accent color from the raw theme var; if lint rejects it, use `accent-phosphor` if the token utility exists, else drop the class — a default checkbox is acceptable.)

- [ ] **Step 4: Implement `src/app/(site)/contact/page.tsx`**

`useSearchParams` in a statically rendered page requires a Suspense boundary; the page itself stays static + ISR while the form reads the query client-side.

```tsx
import type { Metadata } from 'next';

import { Suspense } from 'react';

import type { ContactServiceOption } from '@/components/contact/contact-form';

import { ContactForm } from '@/components/contact/contact-form';
import { listServices } from '@/lib/repositories/services';

export const revalidate = 300;

export const metadata: Metadata = {
  description:
    'Request services, ask a question about a post, or just say hi.',
  title: 'contact',
};

export default async function ContactPage() {
  const services: ContactServiceOption[] = (await listServices()).map(
    (service) => ({ name: service.name, slug: service.slug }),
  );
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <p className="font-mono text-sm text-fg-muted">
        <span className="text-phosphor">$</span> cat ./contact.md
      </p>
      <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight sm:text-4xl">
        # Contact
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-fg-muted">
        Request services, ask a question, or just say hi — this lands straight
        in my inbox.
      </p>
      <div className="mt-10">
        <Suspense fallback={null}>
          <ContactForm services={services} />
        </Suspense>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add `/contact` to `src/app/sitemap.ts`**

After the `/uses` entry add: `{ url: \`${siteConfig.url}/contact\` },`

- [ ] **Step 6: Run tests, gate, commit**

```bash
pnpm exec vitest run src/components/contact
pnpm lint && pnpm typecheck
git add "src/app/(site)/contact" src/components/contact src/app/sitemap.ts package.json pnpm-lock.yaml
git commit -m "feat: contact page with services dialog, deep links, and turnstile"
```

---

### Task 8: Newsletter surfaces — form, home beat, confirm/unsubscribe pages

**Files:**
- Create: `src/components/newsletter/newsletter-form.tsx`, `src/components/home/newsletter-beat.tsx`, `src/app/(site)/newsletter/confirm/page.tsx`, `src/app/(site)/newsletter/unsubscribe/page.tsx`
- Modify: `src/app/(site)/page.tsx` (add beat), `src/app/(site)/contact/page.tsx` (newsletter section)
- Test: `src/components/newsletter/newsletter-form.test.tsx`, `src/components/home/newsletter-beat.test.tsx`

**Interfaces:**
- Consumes: `subscribeNewsletter` (Task 5), `turnstileSiteKey` (Task 4), `confirmSubscriber`/`unsubscribeSubscriber` (Task 3), `TerminalSection` (P3).
- Produces: `NewsletterForm()`; `NewsletterBeat()`; dynamic routes `/newsletter/confirm` and `/newsletter/unsubscribe` (`robots: noindex`).

- [ ] **Step 1: Write the failing tests**

`src/components/newsletter/newsletter-form.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { NewsletterForm } from '@/components/newsletter/newsletter-form';
import { subscribeNewsletter } from '@/lib/actions/newsletter';

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess }: { onSuccess?: (token: string) => void }) => (
    <button onClick={() => onSuccess?.('test-token')} type="button">
      solve turnstile
    </button>
  ),
}));
vi.mock('@/lib/actions/newsletter', () => ({
  subscribeNewsletter: vi.fn().mockResolvedValue({ success: true }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('NewsletterForm', () => {
  it('submits and shows the check-your-inbox state', async () => {
    const user = userEvent.setup();
    render(<NewsletterForm />);
    await user.type(screen.getByLabelText('email'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: 'solve turnstile' }));
    await user.click(screen.getByRole('button', { name: /subscribe/ }));
    expect(
      await screen.findByText(/check your inbox to confirm/),
    ).toBeInTheDocument();
    expect(subscribeNewsletter).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.com', turnstileToken: 'test-token' }),
    );
  });

  it('shows a validation error for a bad email without calling the action', async () => {
    const user = userEvent.setup();
    render(<NewsletterForm />);
    await user.type(screen.getByLabelText('email'), 'nope');
    await user.click(screen.getByRole('button', { name: /subscribe/ }));
    expect(await screen.findByText(/enter a valid email/)).toBeInTheDocument();
    expect(subscribeNewsletter).not.toHaveBeenCalled();
  });

  it('surfaces server errors', async () => {
    vi.mocked(subscribeNewsletter).mockResolvedValueOnce({
      error: 'something broke — retry in a bit',
      success: false,
    });
    const user = userEvent.setup();
    render(<NewsletterForm />);
    await user.type(screen.getByLabelText('email'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: 'solve turnstile' }));
    await user.click(screen.getByRole('button', { name: /subscribe/ }));
    expect(await screen.findByText(/something broke/)).toBeInTheDocument();
  });
});
```

`src/components/home/newsletter-beat.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { NewsletterBeat } from '@/components/home/newsletter-beat';

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: () => <div data-testid="turnstile" />,
}));

describe('NewsletterBeat', () => {
  it('renders the prompt, pitch, and form', () => {
    render(<NewsletterBeat />);
    expect(screen.getByText('subscribe --newsletter')).toBeInTheDocument();
    expect(screen.getByLabelText('email')).toBeInTheDocument();
    expect(
      screen.getByText(/new posts, straight to your inbox/),
    ).toBeInTheDocument();
  });
});
```

Run: `pnpm exec vitest run src/components/newsletter src/components/home/newsletter-beat.test.tsx` — Expected: FAIL.

- [ ] **Step 2: Implement `src/components/newsletter/newsletter-form.tsx`**

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Turnstile } from '@marsidev/react-turnstile';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import type { NewsletterFormValues } from '@/lib/validation/newsletter';

import { subscribeNewsletter } from '@/lib/actions/newsletter';
import { turnstileSiteKey } from '@/lib/turnstile';
import { newsletterSchema } from '@/lib/validation/newsletter';

export function NewsletterForm() {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<null | string>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<NewsletterFormValues>({
    defaultValues: { email: '', turnstileToken: '', website: '' },
    resolver: zodResolver(newsletterSchema),
  });
  const errors = form.formState.errors;

  function onSubmit(values: NewsletterFormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await subscribeNewsletter(values);
      if (result.success) {
        setDone(true);
      } else {
        setServerError(result.error ?? 'something broke — retry in a bit');
      }
    });
  }

  if (done) {
    return (
      <p className="font-mono text-sm text-phosphor" role="status">
        subscription pending — check your inbox to confirm ✓
      </p>
    );
  }

  return (
    <form
      className="max-w-md space-y-3"
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="sr-only" htmlFor="newsletter-email">
            email
          </label>
          <input
            aria-describedby={
              errors.email ? 'newsletter-email-error' : undefined
            }
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            className="w-full rounded border border-edge bg-surface px-3 py-2 font-mono text-sm text-fg focus:border-phosphor focus:outline-none"
            id="newsletter-email"
            placeholder="you@example.com"
            type="email"
            {...form.register('email')}
          />
        </div>
        <button
          className="rounded border border-phosphor px-4 py-2 font-mono text-sm text-phosphor transition-colors hover:bg-phosphor hover:text-canvas disabled:opacity-50"
          disabled={isPending}
          type="submit"
        >
          {isPending ? 'sending…' : 'subscribe'}
        </button>
      </div>
      {errors.email ? (
        <p
          className="font-mono text-xs text-fg-muted"
          id="newsletter-email-error"
        >
          # {errors.email.message}
        </p>
      ) : null}
      <div className="hidden">
        <label htmlFor="newsletter-website">website</label>
        <input
          autoComplete="off"
          id="newsletter-website"
          tabIndex={-1}
          type="text"
          {...form.register('website')}
        />
      </div>
      <Turnstile
        onSuccess={(token) =>
          form.setValue('turnstileToken', token, { shouldValidate: true })
        }
        siteKey={turnstileSiteKey()}
      />
      {errors.turnstileToken ? (
        <p className="font-mono text-xs text-fg-muted">
          # {errors.turnstileToken.message}
        </p>
      ) : null}
      {serverError ? (
        <p className="font-mono text-sm text-fg-muted" role="alert">
          # {serverError}
        </p>
      ) : null}
    </form>
  );
}
```

- [ ] **Step 3: Implement `src/components/home/newsletter-beat.tsx`**

```tsx
import { TerminalSection } from '@/components/home/terminal-section';
import { NewsletterForm } from '@/components/newsletter/newsletter-form';

export function NewsletterBeat() {
  return (
    <TerminalSection command="subscribe --newsletter">
      <p className="max-w-2xl leading-relaxed text-fg-muted">
        new posts, straight to your inbox. no spam, no schedule, unsubscribe
        anytime.
      </p>
      <div className="mt-5">
        <NewsletterForm />
      </div>
    </TerminalSection>
  );
}
```

- [ ] **Step 4: Wire the beat into `src/app/(site)/page.tsx`**

Import `NewsletterBeat` and render it AFTER `<LatestPostsBeat posts={posts} />` (spec beat order: newsletter is beat 8, last before the footer).

- [ ] **Step 5: Add the newsletter section to `src/app/(site)/contact/page.tsx`**

After the form's closing `</div>`, add:

```tsx
      <section className="mt-16 border-t border-edge pt-10">
        <p className="font-mono text-sm text-fg-muted">
          <span className="text-phosphor">$</span> subscribe --newsletter
        </p>
        <div className="mt-5">
          <NewsletterForm />
        </div>
      </section>
```

with `import { NewsletterForm } from '@/components/newsletter/newsletter-form';` added to the imports.

- [ ] **Step 6: Implement the confirm and unsubscribe pages**

`src/app/(site)/newsletter/confirm/page.tsx`:

```tsx
import type { Metadata } from 'next';

import { confirmSubscriber } from '@/lib/repositories/subscribers';

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'confirm subscription',
};

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const confirmed = token ? await confirmSubscriber(token) : false;
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <p className="font-mono text-sm text-fg-muted">
        <span className="text-phosphor">$</span> ./confirm-subscription
      </p>
      {confirmed ? (
        <>
          <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight">
            # subscribed ✓
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-fg-muted">
            you&apos;re in — new posts land in your inbox. unsubscribe anytime
            from any email.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight">
            # invalid token
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-fg-muted">
            this confirmation link is invalid or was replaced by a newer one —
            subscribe again to get a fresh link.
          </p>
        </>
      )}
    </div>
  );
}
```

`src/app/(site)/newsletter/unsubscribe/page.tsx`:

```tsx
import type { Metadata } from 'next';

import { unsubscribeSubscriber } from '@/lib/repositories/subscribers';

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'unsubscribe',
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const unsubscribed = token ? await unsubscribeSubscriber(token) : false;
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <p className="font-mono text-sm text-fg-muted">
        <span className="text-phosphor">$</span> ./unsubscribe
      </p>
      {unsubscribed ? (
        <>
          <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight">
            # unsubscribed
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-fg-muted">
            done — no more email from here. resubscribe anytime if you change
            your mind.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight">
            # invalid token
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-fg-muted">
            this unsubscribe link is invalid — reply to any newsletter email
            and I&apos;ll remove you by hand.
          </p>
        </>
      )}
    </div>
  );
}
```

(Known, accepted tradeoff: link-scanner prefetches can auto-confirm — benign at this scale and standard for one-click confirm links. These pages render dynamically because they await `searchParams`; they stay out of the sitemap and carry `robots: noindex`.)

- [ ] **Step 7: Full phase gate and commit**

```bash
pnpm exec vitest run src/components/newsletter src/components/home/newsletter-beat.test.tsx
pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build:ci
git add src/components/newsletter src/components/home/newsletter-beat.tsx "src/app/(site)/newsletter" "src/app/(site)/page.tsx" "src/app/(site)/contact/page.tsx"
git commit -m "feat: newsletter form, home beat, and confirm/unsubscribe pages"
```

(This is the phase's last task: the FULL `pnpm test:coverage` must hold the 90% aggregate thresholds, and the build output should list `/contact` as static and the two `/newsletter/*` routes as dynamic.)

---

## Deferred (by design, this phase)

- Motion/animations, ⌘K palette (cmdk + TanStack Query), PWA/Serwist, OG images (satori), Playwright E2E (incl. contact happy path + services modal + newsletter opt-in) → Phase 5.
- a11y standardization pass (aria-hidden `#`/`$` prefixes, home h2 outline, h1 copy convention), blog dark-print Shiki palette → Phase 5.
- Newsletter composing/sending → out of scope for the whole build (spec §10).

## Owner runbook (post-merge, not agent tasks)

- Vercel env: set `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS` (SES SMTP creds), `EMAIL_FROM` (SES-verified sender), `CONTACT_TO`, real `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY`. Without the Turnstile vars the site falls back to always-pass TEST keys — fine locally, never in prod.
- Move SES out of sandbox (production access) so mail reaches unverified recipients.
- After deploy: submit the contact form end-to-end, subscribe + confirm + unsubscribe with a real inbox.
- Don't edit service slugs in Payload admin — home-beat anchors and contact deep links reference them statically.
