/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import type * as pagesRepo from '@/lib/repositories/pages';

const findPublished = vi.fn();
const findDraft = vi.fn();
const findAllPublished = vi.fn();
const payload = {};

vi.mock('payload', () => ({ getPayload: vi.fn(async () => payload) }));
vi.mock('@/collections/published-page', () => ({
  findPageDraft: (...args: unknown[]) => findDraft(...args),
  findPublishedPage: (...args: unknown[]) => findPublished(...args),
  findPublishedPages: (...args: unknown[]) => findAllPublished(...args),
}));
vi.mock('@payload-config', () => ({ default: {} }));

/** The reads are wrapped in React's `cache`; a fresh registry per test undoes it. */
const importFresh = async (): Promise<typeof pagesRepo> => {
  vi.resetModules();
  return import('@/lib/repositories/pages');
};

const page = (slug: string, status: 'draft' | 'published' = 'published') => ({
  _status: status,
  id: `id-${slug}`,
  slug,
  title: `${slug} title`,
  updatedAt: '2026-11-23T00:00:00.000Z',
});

beforeEach(() => {
  findPublished.mockReset();
  findDraft.mockReset();
  findAllPublished.mockReset();
});

describe('getPage', () => {
  it('returns the Page visitors are served at that address', async () => {
    findPublished.mockResolvedValue(page('uses'));
    const { getPage } = await importFresh();

    await expect(getPage('uses')).resolves.toEqual(page('uses'));
    expect(findPublished).toHaveBeenCalledWith(payload, 'uses');
  });

  it('returns null where no Page is published', async () => {
    findPublished.mockResolvedValue(null);
    const { getPage } = await importFresh();

    await expect(getPage('uses')).resolves.toBeNull();
  });

  /** No fallback to source (docs/adr/0001): the error fails the build. */
  it('lets a database failure surface', async () => {
    findPublished.mockRejectedValue(new Error('the database is down'));
    const { getPage } = await importFresh();

    await expect(getPage('uses')).rejects.toThrow('the database is down');
  });
});

describe('getFixedPage', () => {
  it('returns the Fixed Page', async () => {
    findPublished.mockResolvedValue(page('home'));
    const { getFixedPage } = await importFresh();

    await expect(getFixedPage('home')).resolves.toEqual(page('home'));
  });

  /** A site without its home Page must not build (docs/adr/0001). */
  it('throws when the Fixed Page was never published', async () => {
    findPublished.mockResolvedValue(null);
    const { getFixedPage } = await importFresh();

    await expect(getFixedPage('home')).rejects.toThrow('The home Page is not published');
  });

  it('says how to fix a missing Fixed Page', async () => {
    findPublished.mockResolvedValue(null);
    const { getFixedPage } = await importFresh();

    await expect(getFixedPage('home')).rejects.toThrow('pnpm seed');
  });
});

describe('getPageDraft', () => {
  it("returns the newest saved state, for the owner's preview", async () => {
    findDraft.mockResolvedValue(page('uses', 'draft'));
    const { getPageDraft } = await importFresh();

    await expect(getPageDraft('uses')).resolves.toEqual(page('uses', 'draft'));
    expect(findDraft).toHaveBeenCalledWith(payload, 'uses');
  });
});

describe('listPublishedPages', () => {
  /** Which Pages those are is `findPublishedPages`' to say; see its own spec. */
  it('lists the Pages visitors are served with the address of each', async () => {
    findAllPublished.mockResolvedValue([page('home'), page('uses')]);
    const { listPublishedPages } = await importFresh();

    await expect(listPublishedPages()).resolves.toEqual([
      { href: '/', slug: 'home', title: 'home title', updatedAt: '2026-11-23T00:00:00.000Z' },
      { href: '/uses', slug: 'uses', title: 'uses title', updatedAt: '2026-11-23T00:00:00.000Z' },
    ]);
  });

  it('lists nothing when no Page is served', async () => {
    findAllPublished.mockResolvedValue([]);
    const { listPublishedPages } = await importFresh();

    await expect(listPublishedPages()).resolves.toEqual([]);
  });
});
