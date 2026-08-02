/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

const create = vi.fn();
const find = vi.fn();

vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ create, find })) }));
vi.mock('@payload-config', () => ({ default: {} }));

/** `cache` memoizes per module instance — re-import so each test queries afresh. */
const importFresh = async () => {
  vi.resetModules();
  return import('@/lib/repositories/comments');
};

beforeEach(() => {
  create.mockReset();
  find.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('createComment', () => {
  it('persists a pending comment with access overridden', async () => {
    create.mockResolvedValue({ id: 'c1', status: 'pending' });
    const { createComment } = await importFresh();

    await createComment({
      authorEmail: 'a@b.com',
      authorName: 'Ada',
      body: 'hello',
      parentId: 'parent-1',
      postId: 'post-1',
    });

    expect(create).toHaveBeenCalledWith({
      collection: 'comments',
      data: {
        authorEmail: 'a@b.com',
        authorName: 'Ada',
        body: 'hello',
        parent: 'parent-1',
        post: 'post-1',
        status: 'pending',
      },
      depth: 0,
      overrideAccess: true,
    });
  });

  it('persists a top-level comment without email as null fields', async () => {
    create.mockResolvedValue({ id: 'c1', status: 'pending' });
    const { createComment } = await importFresh();

    await createComment({ authorName: 'Ada', body: 'hello', postId: 'post-1' });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ authorEmail: null, parent: null }),
      })
    );
  });

  it('returns the created document', async () => {
    create.mockResolvedValue({ id: 'c1', status: 'pending' });
    const { createComment } = await importFresh();

    await expect(
      createComment({ authorName: 'Ada', body: 'hello', postId: 'post-1' })
    ).resolves.toEqual({ id: 'c1', status: 'pending' });
  });
});

describe('listApprovedCommentsForPost', () => {
  it('returns the approved documents for the post', async () => {
    find.mockResolvedValue({ docs: [{ id: 'c1' }, { id: 'c2' }] });
    const { listApprovedCommentsForPost } = await importFresh();

    await expect(listApprovedCommentsForPost('post-1')).resolves.toEqual([
      { id: 'c1' },
      { id: 'c2' },
    ]);
  });

  it('queries approved comments of the post oldest-first without access override', async () => {
    find.mockResolvedValue({ docs: [] });
    const { listApprovedCommentsForPost } = await importFresh();

    await listApprovedCommentsForPost('post-1');

    expect(find).toHaveBeenCalledWith({
      collection: 'comments',
      depth: 0,
      limit: 200,
      overrideAccess: false,
      sort: 'createdAt',
      where: {
        and: [{ post: { equals: 'post-1' } }, { status: { equals: 'approved' } }],
      },
    });
  });

  it('renders without comments when the query fails rather than throwing', async () => {
    find.mockRejectedValue(new Error('ECONNREFUSED'));
    const { listApprovedCommentsForPost } = await importFresh();

    await expect(listApprovedCommentsForPost('post-1')).resolves.toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });
});
