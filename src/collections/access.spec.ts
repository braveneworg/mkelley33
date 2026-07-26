import { describe, expect, it } from 'vitest';

import { ContactSubmissions } from '@/collections/contact-submissions';
import { Media } from '@/collections/media';
import { Posts } from '@/collections/posts';
import { Subscribers } from '@/collections/subscribers';

import type { Access, CollectionConfig } from 'payload';

/**
 * Payload passes a large `req` to access functions; these only read `req.user`,
 * so a minimal stand-in keeps the assertions focused on the access rule itself.
 */
const asArgs = (user: unknown): Parameters<Access>[0] =>
  ({ req: { user } }) as unknown as Parameters<Access>[0];

const ANON = asArgs(undefined);
const ADMIN = asArgs({ id: 'user-1' });

const accessOf = (
  collection: CollectionConfig,
  rule: keyof NonNullable<CollectionConfig['access']>
) => {
  const fn = collection.access?.[rule];
  if (typeof fn !== 'function') {
    throw new Error(`${collection.slug} has no ${rule} access rule`);
  }
  return fn;
};

describe.each([
  ['contact-submissions', ContactSubmissions],
  ['subscribers', Subscribers],
])('%s access', (_slug, collection) => {
  it('never allows create through the API', () => {
    expect(accessOf(collection, 'create')(ANON)).toBe(false);
    expect(accessOf(collection, 'create')(ADMIN)).toBe(false);
  });

  it.each(['read', 'update', 'delete'] as const)('denies %s to anonymous requests', (rule) => {
    expect(accessOf(collection, rule)(ANON)).toBe(false);
  });

  it.each(['read', 'update', 'delete'] as const)('allows %s to authenticated users', (rule) => {
    expect(accessOf(collection, rule)(ADMIN)).toBe(true);
  });
});

describe('Posts access', () => {
  it('restricts anonymous reads to published posts', () => {
    expect(accessOf(Posts, 'read')(ANON)).toEqual({ status: { equals: 'published' } });
  });

  it('gives authenticated users unrestricted read', () => {
    expect(accessOf(Posts, 'read')(ADMIN)).toBe(true);
  });
});

describe('Media access', () => {
  it('is publicly readable so uploads render for anonymous visitors', () => {
    expect(accessOf(Media, 'read')(ANON)).toBe(true);
  });
});
