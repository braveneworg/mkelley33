// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const find = vi.fn();

vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ find })) }));
vi.mock('@payload-config', () => ({ default: {} }));

/** `cache` memoizes per module instance — re-import so each test queries afresh. */
const importFresh = async () => {
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
