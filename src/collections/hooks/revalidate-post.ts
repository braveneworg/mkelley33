/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload';

const revalidate = async (paths: string[]): Promise<void> => {
  try {
    const { revalidatePath } = await import('next/cache');
    paths.forEach((p) => revalidatePath(p));
  } catch {
    // Outside the Next.js runtime (scripts, integration tests) — no-op.
  }
};

export const revalidateAfterChange: CollectionAfterChangeHook = async ({ doc, previousDoc }) => {
  const paths = ['/blog', `/blog/${doc.slug}`, '/feed.xml', '/sitemap.xml'];
  if (previousDoc?.slug && previousDoc.slug !== doc.slug) {
    paths.push(`/blog/${previousDoc.slug}`);
  }
  await revalidate(paths);
  return doc;
};

export const revalidateAfterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  await revalidate(['/blog', `/blog/${doc.slug}`, '/feed.xml', '/sitemap.xml']);
  return doc;
};
