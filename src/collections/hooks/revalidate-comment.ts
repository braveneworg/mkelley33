/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload';

/**
 * Only the post page renders comments, so unlike `revalidate-post` there is
 * nothing to invalidate on `/blog`, the feed, or the sitemap.
 */
const revalidatePostPage = async (slug: string): Promise<void> => {
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath(`/blog/${slug}`);
  } catch {
    // Outside the Next.js runtime (scripts, integration tests) — no-op.
  }
};

const slugOf = async (req: PayloadRequest, post: unknown): Promise<null | string> => {
  if (post !== null && typeof post === 'object' && 'slug' in post) {
    const { slug } = post as { slug: unknown };
    return typeof slug === 'string' ? slug : null;
  }
  if (typeof post !== 'string' && typeof post !== 'number') return null;
  try {
    const found = (await req.payload.findByID({
      collection: 'posts',
      depth: 0,
      id: post,
    })) as { slug?: unknown };
    return typeof found.slug === 'string' ? found.slug : null;
  } catch {
    return null;
  }
};

export const revalidateCommentAfterChange: CollectionAfterChangeHook = async ({ doc, req }) => {
  const slug = await slugOf(req, doc.post);
  if (slug) await revalidatePostPage(slug);
  return doc;
};

export const revalidateCommentAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const slug = await slugOf(req, doc.post);
  if (slug) await revalidatePostPage(slug);
  return doc;
};
