// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type * as postsRepo from '@/lib/repositories/posts';
import type { Post } from '@/payload-types';
import type { TestPayload } from '@/test/payload-harness';
import { createTestPayload } from '@/test/payload-harness';

let harness: TestPayload;
let repo: typeof postsRepo;

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
  repo = await import('@/lib/repositories/posts');
  const mk = (slug: string, status: 'draft' | 'published', publishedAt: string) =>
    harness.payload.create({
      collection: 'posts',
      data: { body, publishedAt, slug, status, title: slug },
      overrideAccess: true,
    });
  await mk('newest-post', 'published', '2024-02-06T00:00:00.000Z');
  await mk('older-post', 'published', '2023-07-07T00:00:00.000Z');
  await mk('secret-draft', 'draft', '2024-03-01T00:00:00.000Z');
});

afterAll(async () => {
  await harness.teardown();
});

describe('listPublishedPosts', () => {
  it('returns only published posts, newest first', async () => {
    const posts = await repo.listPublishedPosts();
    expect(posts.map((p) => p.slug)).toEqual(['newest-post', 'older-post']);
  });

  it('computes readTime via the beforeChange hook', async () => {
    const posts = await repo.listPublishedPosts();
    expect(posts[0]?.readTime).toBe(1);
  });
});

describe('getPostBySlug', () => {
  it('returns the published post', async () => {
    const post = await repo.getPostBySlug('older-post');
    expect(post?.title).toBe('older-post');
  });

  it('returns null for drafts and unknown slugs', async () => {
    expect(await repo.getPostBySlug('secret-draft')).toBeNull();
    expect(await repo.getPostBySlug('nope')).toBeNull();
  });
});
