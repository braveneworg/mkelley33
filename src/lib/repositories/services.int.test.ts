import type { Payload } from 'payload';

// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

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
