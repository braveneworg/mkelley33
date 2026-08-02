/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { cache } from 'react';

import { getPayload } from 'payload';

import config from '@payload-config';

import type { Post } from '@/payload-types';

const client = async () => getPayload({ config });

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

/** Published-only by-id read; the comment action uses it to title the owner email. */
export const getPublishedPostById = cache(async (id: string): Promise<Post | null> => {
  try {
    const payload = await client();
    const result = await payload.find({
      collection: 'posts',
      limit: 1,
      overrideAccess: false,
      where: {
        and: [{ id: { equals: id } }, { status: { equals: 'published' } }],
      },
    });
    return result.docs[0] ?? null;
  } catch (error) {
    console.error(`getPublishedPostById(${id}) failed:`, error);
    return null;
  }
});

export const getPostBySlug = cache(async (slug: string): Promise<Post | null> => {
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
});
