import config from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

import type { Post } from '@/payload-types';

async function client() {
  return getPayload({ config });
}

export const listPublishedPosts = cache(async (): Promise<Post[]> => {
  try {
    const payload = await client();
    const result = await payload.find({
      collection: 'posts',
      limit: 100,
      overrideAccess: false,
      sort: '-publishedAt',
      where: { status: { equals: 'published' } },
    });
    return result.docs;
  } catch (error) {
    console.error('listPublishedPosts failed — rendering without posts:', error);
    return [];
  }
});

export const getPostBySlug = cache(
  async (slug: string): Promise<Post | null> => {
    try {
      const payload = await client();
      const result = await payload.find({
        collection: 'posts',
        limit: 1,
        overrideAccess: false,
        where: {
          and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
        },
      });
      return result.docs[0] ?? null;
    } catch (error) {
      console.error(`getPostBySlug(${slug}) failed:`, error);
      return null;
    }
  },
);
