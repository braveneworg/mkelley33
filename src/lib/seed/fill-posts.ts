/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * The posts half of the fill. A post that is missing is created, published,
 * with the pictures its text shows uploaded alongside it; a post that
 * exists — published or draft — is left exactly as it is.
 */

import type { PostSeed } from '@/lib/seed/post-seed';
import { toStoredText } from '@/lib/seed/seed-text';
import { withPictures } from '@/lib/seed/seed-uploads';

import type { Payload } from 'payload';

const POSTS = 'posts';

/** How the report names a post. */
export const postLabel = ({ slug }: Pick<PostSeed, 'slug'>): string => `post ${slug}`;

/** True when a post already holds this slug, whatever its status. */
export const postExists = async (
  payload: Payload,
  { slug }: Pick<PostSeed, 'slug'>
): Promise<boolean> => {
  const existing = await payload.count({ collection: POSTS, where: { slug: { equals: slug } } });
  return existing.totalDocs > 0;
};

/** Creates one post, published, and resolves to how many files it uploaded. */
const createPost = async (
  payload: Payload,
  directory: string,
  { body, ...post }: PostSeed,
  pageIds: ReadonlyMap<string, string>
): Promise<number> => {
  const { uploads } = await withPictures(
    payload,
    directory,
    () => postExists(payload, post),
    async (upload) => {
      await payload.create({
        collection: POSTS,
        data: { ...post, body: await toStoredText(body, { pageIds, upload }), status: 'published' },
      });
    }
  );
  return uploads.length;
};

export interface PostsFill {
  /** Labels of the posts this run created. */
  readonly created: string[];
  /** Labels of the posts that already existed and were left alone. */
  readonly kept: string[];
  /** How many files this run uploaded. */
  readonly uploads: number;
}

/**
 * Creates the Seed's missing posts. `pageIds` holds the id of every Page
 * the Seed carries, because a post's text may link to one.
 */
export const fillPosts = async (
  payload: Payload,
  directory: string,
  posts: readonly PostSeed[],
  pageIds: ReadonlyMap<string, string>
): Promise<PostsFill> => {
  const created: string[] = [];
  const kept: string[] = [];
  let uploads = 0;
  for (const post of posts) {
    if (await postExists(payload, post)) {
      kept.push(postLabel(post));
    } else {
      uploads += await createPost(payload, directory, post, pageIds);
      created.push(postLabel(post));
    }
  }
  return { created, kept, uploads };
};
