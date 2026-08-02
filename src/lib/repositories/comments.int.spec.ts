/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import type * as commentsRepo from '@/lib/repositories/comments';
import type { Post } from '@/payload-types';
import type { TestPayload } from '@/test/payload-harness';
import { createTestPayload } from '@/test/payload-harness';

let harness: TestPayload;
let repo: typeof commentsRepo;
let publishedPost: Post;
let draftPost: Post;
let approvedTopLevelId: string;

const body: Post['body'] = {
  root: {
    children: [
      {
        children: [{ text: 'hello content', type: 'text', version: 1 }],
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
};

beforeAll(async () => {
  harness = await createTestPayload();
  repo = await import('@/lib/repositories/comments');
  const mkPost = (slug: string, status: 'draft' | 'published') =>
    harness.payload.create({
      collection: 'posts',
      data: { body, publishedAt: '2024-02-06T00:00:00.000Z', slug, status, title: slug },
      overrideAccess: true,
    });
  publishedPost = await mkPost('commented-post', 'published');
  draftPost = await mkPost('quiet-draft', 'draft');

  const first = await harness.payload.create({
    collection: 'comments',
    data: {
      authorEmail: 'kept-private@example.com',
      authorName: 'First',
      body: 'first!',
      createdAt: '2024-03-01T00:00:00.000Z',
      post: publishedPost.id,
      status: 'approved',
    },
    overrideAccess: true,
  });
  approvedTopLevelId = first.id;
  await harness.payload.create({
    collection: 'comments',
    data: {
      authorName: 'Second',
      body: 'second!',
      createdAt: '2024-03-02T00:00:00.000Z',
      post: publishedPost.id,
      status: 'approved',
    },
    overrideAccess: true,
  });
});

afterAll(async () => {
  await harness.teardown();
});

describe('createComment', () => {
  it('defaults every submission to pending', async () => {
    const created = await repo.createComment({
      authorName: 'Ada',
      body: 'awaiting the mods',
      postId: publishedPost.id,
    });
    expect(created.status).toBe('pending');
  });

  it('rejects a comment on a draft post', async () => {
    await expect(
      repo.createComment({ authorName: 'Ada', body: 'sneaky', postId: draftPost.id })
    ).rejects.toThrow('comments are only accepted on published posts');
  });

  it('rejects a reply to a reply', async () => {
    const reply = await repo.createComment({
      authorName: 'Ada',
      body: 'a reply',
      parentId: approvedTopLevelId,
      postId: publishedPost.id,
    });
    await expect(
      repo.createComment({
        authorName: 'Eve',
        body: 'a reply to the reply',
        parentId: reply.id,
        postId: publishedPost.id,
      })
    ).rejects.toThrow('replies to replies are not allowed');
  });

  it('rejects a reply whose parent belongs to another post', async () => {
    const otherPost = await harness.payload.create({
      collection: 'posts',
      data: {
        body,
        publishedAt: '2024-02-06T00:00:00.000Z',
        slug: 'other-post',
        status: 'published',
        title: 'other-post',
      },
      overrideAccess: true,
    });
    await expect(
      repo.createComment({
        authorName: 'Eve',
        body: 'grafted thread',
        parentId: approvedTopLevelId,
        postId: otherPost.id,
      })
    ).rejects.toThrow('parent comment belongs to another post');
  });
});

describe('listApprovedCommentsForPost', () => {
  it('returns only approved comments, oldest first', async () => {
    const comments = await repo.listApprovedCommentsForPost(publishedPost.id);
    expect(comments.map((c) => c.authorName)).toEqual(['First', 'Second']);
  });

  it('never exposes authorEmail to the user-less read path', async () => {
    const comments = await repo.listApprovedCommentsForPost(publishedPost.id);
    expect(comments.map((c) => c.authorEmail)).toEqual([undefined, undefined]);
  });
});
