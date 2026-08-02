/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { cache } from 'react';

import { getPayload } from 'payload';

import config from '@payload-config';

import type { Comment } from '@/payload-types';

const client = async () => getPayload({ config });

/**
 * Bounded read — a post with more than 200 approved comments needs
 * pagination, not a bigger number; revisit if any post ever gets close.
 */
const APPROVED_COMMENTS_LIMIT = 200;

export interface CreateCommentInput {
  authorEmail?: string;
  authorName: string;
  body: string;
  parentId?: string;
  postId: string;
}

/**
 * Mutation — the Server Action is the gatekeeper, so access is overridden.
 * `status` is forced to `pending` here; nothing a caller passes can publish
 * a comment. Integrity (published post, same-post top-level parent) is
 * enforced by the collection's `beforeValidate` hook, which throws through
 * this call.
 */
export const createComment = async (input: CreateCommentInput): Promise<Comment> => {
  const payload = await client();
  return payload.create({
    collection: 'comments',
    data: {
      authorEmail: input.authorEmail ?? null,
      authorName: input.authorName,
      body: input.body,
      parent: input.parentId ?? null,
      post: input.postId,
      status: 'pending',
    },
    depth: 0,
    overrideAccess: true,
  });
};

/**
 * Read path for the post page. `overrideAccess: false` keeps the query
 * behind the collection's anonymous-read constraint (approved only), and the
 * user-less request strips `authorEmail` at the field level. `depth: 0`
 * leaves `post`/`parent` as id strings for threading.
 */
export const listApprovedCommentsForPost = cache(async (postId: string): Promise<Comment[]> => {
  try {
    const payload = await client();
    const result = await payload.find({
      collection: 'comments',
      depth: 0,
      limit: APPROVED_COMMENTS_LIMIT,
      overrideAccess: false,
      sort: 'createdAt',
      where: {
        and: [{ post: { equals: postId } }, { status: { equals: 'approved' } }],
      },
    });
    return result.docs;
  } catch (error) {
    console.error(`listApprovedCommentsForPost(${postId}) failed — rendering without:`, error);
    return [];
  }
});
