/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { APIError } from 'payload';

import type { Comment, Post } from '@/payload-types';

import type { CollectionBeforeValidateHook, PayloadRequest } from 'payload';

/**
 * Relationship values arrive as an id string on local-API writes but can be
 * a populated document elsewhere; both shapes resolve to the id.
 */
const idOf = (value: unknown): null | string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value !== null && typeof value === 'object' && 'id' in value) {
    return idOf((value as { id: unknown }).id);
  }
  return null;
};

const findPost = async (req: PayloadRequest, id: string): Promise<null | Post> => {
  try {
    return await req.payload.findByID({ collection: 'posts', depth: 0, id });
  } catch {
    return null;
  }
};

const findComment = async (req: PayloadRequest, id: string): Promise<Comment | null> => {
  try {
    return await req.payload.findByID({ collection: 'comments', depth: 0, id });
  } catch {
    return null;
  }
};

const assertPublishedPost = async (req: PayloadRequest, postId: string): Promise<void> => {
  const post = await findPost(req, postId);
  if (!post || post.status !== 'published') {
    throw new APIError('comments are only accepted on published posts', 400);
  }
};

const assertTopLevelSamePostParent = async (
  req: PayloadRequest,
  parentId: string,
  postId: string
): Promise<void> => {
  const parent = await findComment(req, parentId);
  if (!parent) throw new APIError('parent comment not found', 400);
  if (idOf(parent.parent)) throw new APIError('replies to replies are not allowed', 400);
  if (idOf(parent.post) !== postId) {
    throw new APIError('parent comment belongs to another post', 400);
  }
};

/**
 * The single authoritative integrity gate for comment writes. It runs on
 * every path — including the Server Action's `overrideAccess: true` create,
 * where collection access rules are skipped — and enforces:
 *
 * 1. the target post exists and is published,
 * 2. a reply's parent belongs to the same post,
 * 3. a reply's parent is itself top-level (one-level threading).
 *
 * The public UI never offers the violating inputs, so a rejection here is an
 * attacker or a bug, and the generic failure copy from the action is the
 * right response.
 */
export const validateCommentTarget: CollectionBeforeValidateHook = async ({
  data,
  operation,
  req,
}) => {
  if (!data) return data;
  if (operation !== 'create' && data.post === undefined && data.parent === undefined) {
    return data;
  }

  const postId = idOf(data.post);
  if (!postId) throw new APIError('comment target post is required', 400);
  await assertPublishedPost(req, postId);

  const parentId = idOf(data.parent);
  if (parentId) await assertTopLevelSamePostParent(req, parentId, postId);

  return data;
};
