/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import type * as postsRepo from '@/lib/repositories/posts';

const find = vi.fn();

vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ find })) }));
vi.mock('@payload-config', () => ({ default: {} }));

/** `cache` memoizes per module instance — re-import so each test queries afresh. */
const importFresh = async (): Promise<typeof postsRepo> => {
  vi.resetModules();
  return import('@/lib/repositories/posts');
};

beforeEach(() => {
  find.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('listPublishedPosts', () => {
  it('returns the published documents', async () => {
    find.mockResolvedValue({ docs: [{ slug: 'a' }, { slug: 'b' }] });
    const { listPublishedPosts } = await importFresh();

    await expect(listPublishedPosts()).resolves.toEqual([{ slug: 'a' }, { slug: 'b' }]);
  });

  it('renders without posts when the query fails rather than throwing', async () => {
    find.mockRejectedValue(new Error('ECONNREFUSED'));
    const { listPublishedPosts } = await importFresh();

    await expect(listPublishedPosts()).resolves.toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });
});

describe('getPublishedPostById', () => {
  it('returns the matching published post', async () => {
    find.mockResolvedValue({ docs: [{ id: 'p1', title: 'Hello' }] });
    const { getPublishedPostById } = await importFresh();

    await expect(getPublishedPostById('p1')).resolves.toEqual({ id: 'p1', title: 'Hello' });
  });

  it('returns null when no published post matches', async () => {
    find.mockResolvedValue({ docs: [] });
    const { getPublishedPostById } = await importFresh();

    await expect(getPublishedPostById('missing')).resolves.toBeNull();
  });

  it('returns null instead of throwing when the query fails', async () => {
    find.mockRejectedValue(new Error('boom'));
    const { getPublishedPostById } = await importFresh();

    await expect(getPublishedPostById('p1')).resolves.toBeNull();
    expect(console.error).toHaveBeenCalled();
  });
});

describe('getPostBySlug', () => {
  it('returns the matching post', async () => {
    find.mockResolvedValue({ docs: [{ slug: 'hello' }] });
    const { getPostBySlug } = await importFresh();

    await expect(getPostBySlug('hello')).resolves.toEqual({ slug: 'hello' });
  });

  it('returns null when no published post matches', async () => {
    find.mockResolvedValue({ docs: [] });
    const { getPostBySlug } = await importFresh();

    await expect(getPostBySlug('missing')).resolves.toBeNull();
  });

  it('returns null instead of throwing when the query fails', async () => {
    find.mockRejectedValue(new Error('boom'));
    const { getPostBySlug } = await importFresh();

    await expect(getPostBySlug('hello')).resolves.toBeNull();
    expect(console.error).toHaveBeenCalled();
  });
});
