/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import type * as servicesRepo from '@/lib/repositories/services';
import { fillSeed } from '@/lib/seed/fill-seed';
import { loadSeed } from '@/lib/seed/seed-files';
import { createTestPayload } from '@/test/payload-harness';

import type { Payload } from 'payload';

let payload: Payload;
let reset: () => Promise<void>;
let teardown: () => Promise<void>;

const importFresh = async (): Promise<typeof servicesRepo> => {
  vi.resetModules();
  return import('@/lib/repositories/services');
};

beforeAll(async () => {
  ({ payload, reset, teardown } = await createTestPayload());
}, 120_000);

// Every test starts from an empty database and arranges what it needs.
beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await teardown();
});

describe('the services repository', () => {
  it('lists nothing while the collection is empty', async () => {
    const { listServices } = await importFresh();

    await expect(listServices()).resolves.toEqual([]);
  });

  it("lists the committed Seed's services in Seed order", async () => {
    const seed = loadSeed('seed');
    await fillSeed(payload, seed);
    const { listServices } = await importFresh();

    await expect(listServices()).resolves.toEqual(seed.services);
  });
});
