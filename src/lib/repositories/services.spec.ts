/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import type * as servicesRepo from '@/lib/repositories/services';

const find = vi.fn();

vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ find })) }));
vi.mock('@payload-config', () => ({ default: {} }));

/**
 * `listServices` is wrapped in React's `cache`, which memoizes per module
 * instance — each test re-imports through a fresh registry so one test's result
 * can't satisfy the next one's call.
 */
const importFresh = async (): Promise<typeof servicesRepo> => {
  vi.resetModules();
  return import('@/lib/repositories/services');
};

beforeEach(() => {
  find.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('listServices', () => {
  it('maps documents from the CMS onto ServiceContent', async () => {
    find.mockResolvedValue({
      docs: [
        {
          credibility: 'shipped it',
          deliverables: ['a', 'b'],
          name: 'Audit',
          pitch: 'a pitch',
          slug: 'audit',
        },
      ],
    });
    const { listServices } = await importFresh();

    await expect(listServices()).resolves.toEqual([
      {
        credibility: 'shipped it',
        deliverables: ['a', 'b'],
        name: 'Audit',
        pitch: 'a pitch',
        slug: 'audit',
      },
    ]);
  });

  /** An empty collection is a state the owner can create, not a fault. */
  it('returns an empty list when the collection is empty', async () => {
    find.mockResolvedValue({ docs: [] });
    const { listServices } = await importFresh();

    await expect(listServices()).resolves.toEqual([]);
  });

  /**
   * No fallback to source (docs/adr/0001): a failure has to reach Next, which
   * fails the build, or keeps serving the last good page when it happens
   * during revalidation.
   */
  it('lets a database failure surface', async () => {
    find.mockRejectedValue(new Error('ECONNREFUSED'));
    const { listServices } = await importFresh();

    await expect(listServices()).rejects.toThrow('ECONNREFUSED');
  });
});

describe('findServiceIdsBySlugs', () => {
  it('returns an empty array without querying when given no slugs', async () => {
    const { findServiceIdsBySlugs } = await importFresh();

    await expect(findServiceIdsBySlugs([])).resolves.toEqual([]);
    expect(find).not.toHaveBeenCalled();
  });

  it('returns the matching document ids as strings', async () => {
    find.mockResolvedValue({ docs: [{ id: 1 }, { id: 'two' }] });
    const { findServiceIdsBySlugs } = await importFresh();

    await expect(findServiceIdsBySlugs(['a', 'b'])).resolves.toEqual(['1', 'two']);
  });

  it('returns an empty array when the query fails', async () => {
    find.mockRejectedValue(new Error('boom'));
    const { findServiceIdsBySlugs } = await importFresh();

    await expect(findServiceIdsBySlugs(['a'])).resolves.toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });
});
