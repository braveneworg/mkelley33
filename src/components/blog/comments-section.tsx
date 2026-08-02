/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CommentForm } from '@/components/blog/comment-form';
import { CommentList } from '@/components/blog/comment-list';
import { threadComments } from '@/lib/thread-comments';
import type { Comment } from '@/payload-types';

export interface CommentsSectionProps {
  /** Approved comments, oldest first — straight from the repository. */
  comments: Comment[];
  postId: string;
}

export const CommentsSection = ({ comments, postId }: CommentsSectionProps) => {
  const threads = threadComments(comments);
  return (
    <section aria-labelledby="comments-heading" className="border-edge mt-12 border-t pt-6">
      <p className="text-fg-muted font-mono text-sm">
        <span aria-hidden="true" className="text-phosphor">
          $
        </span>{' '}
        cat ./comments
      </p>
      <h2 className="mt-4 font-mono text-xl font-bold tracking-tight" id="comments-heading">
        <span aria-hidden="true"># </span>
        comments ({comments.length})
      </h2>
      {comments.length === 0 ? (
        <p className="text-fg-muted mt-4 font-mono text-sm">no comments yet — start the thread</p>
      ) : (
        <CommentList postId={postId} threads={threads} />
      )}
      <h3 className="mt-10 font-mono text-sm font-bold">leave a comment</h3>
      <div className="mt-3">
        <CommentForm postId={postId} />
      </div>
    </section>
  );
};
