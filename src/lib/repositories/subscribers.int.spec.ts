// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestPayload } from '@/test/payload-harness';

import type { Payload } from 'payload';

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
    const { confirmSubscriber, upsertPendingSubscriber } =
      await import('@/lib/repositories/subscribers');
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
    const { upsertPendingSubscriber } = await import('@/lib/repositories/subscribers');
    const result = await upsertPendingSubscriber('one@example.com');
    expect(result).toEqual({ alreadyActive: true, rawToken: null });
  });

  it('confirm is idempotent and rejects unknown tokens', async () => {
    const { confirmSubscriber } = await import('@/lib/repositories/subscribers');
    expect(await confirmSubscriber('0'.repeat(64))).toBe(false);
  });

  it('unsubscribes by token and allows re-subscribing', async () => {
    const { unsubscribeSubscriber, upsertPendingSubscriber } =
      await import('@/lib/repositories/subscribers');
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

  it('rejects a stale confirm link after unsubscribing', async () => {
    const { confirmSubscriber, unsubscribeSubscriber, upsertPendingSubscriber } =
      await import('@/lib/repositories/subscribers');
    const fresh = await upsertPendingSubscriber('three@example.com');
    expect(await confirmSubscriber(fresh.rawToken ?? '')).toBe(true);
    expect(await unsubscribeSubscriber(fresh.rawToken ?? '')).toBe(true);
    expect(await confirmSubscriber(fresh.rawToken ?? '')).toBe(false);
    const found = await payload.find({
      collection: 'subscribers',
      where: { email: { equals: 'three@example.com' } },
    });
    expect(found.docs[0]?.status).toBe('unsubscribed');
  });
});
