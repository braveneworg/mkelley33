/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { validateCommentTarget } from '@/collections/hooks/validate-comment';

const findByID = vi.fn();

const req = { payload: { findByID } };

const DOCS = new Map<string, Record<string, unknown>>([
  ['posts:post-1', { id: 'post-1', status: 'published' }],
  ['posts:draft-post', { id: 'draft-post', status: 'draft' }],
  ['comments:comment-1', { id: 'comment-1', parent: null, post: 'post-1' }],
  ['comments:reply-1', { id: 'reply-1', parent: 'comment-1', post: 'post-1' }],
  ['comments:other-post-comment', { id: 'other-post-comment', parent: null, post: 'post-2' }],
]);

beforeEach(() => {
  findByID.mockReset();
  findByID.mockImplementation(({ collection, id }: { collection: string; id: string }) => {
    const doc = DOCS.get(`${collection}:${id}`);
    return doc ? Promise.resolve(doc) : Promise.reject(new Error('not found'));
  });
});

describe('validateCommentTarget', () => {
  it('passes a top-level comment on a published post', async () => {
    const data = { body: 'hi', post: 'post-1' };

    await expect(validateCommentTarget({ data, operation: 'create', req } as never)).resolves.toBe(
      data
    );
  });

  it('passes a reply to a top-level comment of the same post', async () => {
    const data = { body: 'hi', parent: 'comment-1', post: 'post-1' };

    await expect(validateCommentTarget({ data, operation: 'create', req } as never)).resolves.toBe(
      data
    );
  });

  it('resolves a populated post object to its id', async () => {
    const data = { body: 'hi', post: { id: 'post-1' } };

    await expect(validateCommentTarget({ data, operation: 'create', req } as never)).resolves.toBe(
      data
    );
  });

  it('rejects a reply whose parent is itself a reply', async () => {
    const data = { body: 'hi', parent: 'reply-1', post: 'post-1' };

    await expect(
      validateCommentTarget({ data, operation: 'create', req } as never)
    ).rejects.toThrow('replies to replies are not allowed');
  });

  it('rejects a reply whose parent belongs to another post', async () => {
    const data = { body: 'hi', parent: 'other-post-comment', post: 'post-1' };

    await expect(
      validateCommentTarget({ data, operation: 'create', req } as never)
    ).rejects.toThrow('parent comment belongs to another post');
  });

  it('rejects a comment on a missing post', async () => {
    const data = { body: 'hi', post: 'gone' };

    await expect(
      validateCommentTarget({ data, operation: 'create', req } as never)
    ).rejects.toThrow('comments are only accepted on published posts');
  });

  it('rejects a comment on a draft post', async () => {
    const data = { body: 'hi', post: 'draft-post' };

    await expect(
      validateCommentTarget({ data, operation: 'create', req } as never)
    ).rejects.toThrow('comments are only accepted on published posts');
  });

  it('rejects a reply whose parent is missing', async () => {
    const data = { body: 'hi', parent: 'gone', post: 'post-1' };

    await expect(
      validateCommentTarget({ data, operation: 'create', req } as never)
    ).rejects.toThrow('parent comment not found');
  });

  it('rejects a create without a post', async () => {
    const data = { body: 'hi' };

    await expect(
      validateCommentTarget({ data, operation: 'create', req } as never)
    ).rejects.toThrow('comment target post is required');
  });

  it('skips lookups on an update that touches neither post nor parent', async () => {
    const data = { status: 'approved' };

    await expect(validateCommentTarget({ data, operation: 'update', req } as never)).resolves.toBe(
      data
    );
    expect(findByID).not.toHaveBeenCalled();
  });
});
