// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { seedServices } from '@/lib/services-seed';
import { createTestPayload } from '@/test/payload-harness';

import type { Payload } from 'payload';

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
    const { findServiceIdsBySlugs } = await import('@/lib/repositories/services');
    const ids = await findServiceIdsBySlugs(['ai-enablement', 'nope']);
    expect(ids).toHaveLength(1);
    expect(await findServiceIdsBySlugs([])).toEqual([]);
  });

  it('stores a submission with defaulted status new', async () => {
    const { findServiceIdsBySlugs } = await import('@/lib/repositories/services');
    const { createSubmission } = await import('@/lib/repositories/submissions');
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
