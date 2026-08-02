/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { Post } from '@/payload-types';

import type { Payload } from 'payload';

/**
 * The one published post the E2E suite navigates to (the comments spec
 * submits against it). Seeded by the harness BEFORE `next build` — every
 * page uses ISR, so the post must exist when `/blog/[slug]` prerenders.
 */
export const E2E_POST_SLUG = 'e2e-post';

export interface SeedE2ePostResult {
  created: boolean;
}

const E2E_POST_BODY = {
  root: {
    children: [
      {
        children: [{ text: 'A deterministic post for the E2E suite.', type: 'text', version: 1 }],
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
} as Post['body'];

/** Idempotent: re-running against a warm database never duplicates the post. */
export const seedE2ePost = async (payload: Payload): Promise<SeedE2ePostResult> => {
  const existing = await payload.find({
    collection: 'posts',
    limit: 1,
    where: { slug: { equals: E2E_POST_SLUG } },
  });
  if (existing.docs.length > 0) {
    return { created: false };
  }
  await payload.create({
    collection: 'posts',
    data: {
      body: E2E_POST_BODY,
      excerpt: 'A deterministic post for the E2E suite.',
      publishedAt: '2026-01-01T00:00:00.000Z',
      slug: E2E_POST_SLUG,
      status: 'published',
      title: 'E2E Post',
    },
    overrideAccess: true,
  });
  return { created: true };
};
