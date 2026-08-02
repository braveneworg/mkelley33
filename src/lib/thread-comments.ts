/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { Comment } from '@/payload-types';

export interface CommentThread {
  comment: Comment;
  replies: Comment[];
}

const parentIdOf = ({ parent }: Comment): null | string => {
  if (typeof parent === 'string') return parent;
  if (parent && typeof parent === 'object') return parent.id;
  return null;
};

/**
 * Groups a flat oldest-first list into one-level threads. Replies always
 * postdate their parent, so a single pass suffices. An approved reply whose
 * parent is not in the list (parent unapproved or deleted) is promoted to
 * top level in its own slot rather than dropped.
 */
export const threadComments = (comments: Comment[]): CommentThread[] => {
  const ordered: CommentThread[] = [];
  const byId = new Map<string, CommentThread>();
  comments.forEach((comment) => {
    const parentId = parentIdOf(comment);
    const parentThread = parentId === null ? undefined : byId.get(parentId);
    if (parentThread) {
      parentThread.replies.push(comment);
      return;
    }
    const thread: CommentThread = { comment, replies: [] };
    ordered.push(thread);
    byId.set(comment.id, thread);
  });
  return ordered;
};
