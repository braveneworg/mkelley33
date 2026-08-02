/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CommentReplyControl } from '@/components/blog/comment-reply-control';
import type { CommentThread } from '@/lib/thread-comments';
import type { Comment } from '@/payload-types';

export interface CommentListProps {
  postId: string;
  threads: CommentThread[];
}

/** Shared header + body markup for top-level comments and replies. */
const CommentBody = ({ comment }: { comment: Comment }) => (
  <>
    <header className="flex flex-wrap gap-x-3 font-mono text-xs">
      <span className="text-phosphor">{comment.authorName}</span>
      <time className="text-fg-muted" dateTime={comment.createdAt}>
        {comment.createdAt.slice(0, 10)}
      </time>
    </header>
    <p className="mt-2 text-sm whitespace-pre-wrap">{comment.body}</p>
  </>
);

export const CommentList = ({ postId, threads }: CommentListProps) => (
  <ol className="mt-6 list-none space-y-8 p-0">
    {threads.map(({ comment, replies }) => (
      <li key={comment.id}>
        <article>
          <CommentBody comment={comment} />
          <CommentReplyControl parentId={comment.id} postId={postId} />
          {replies.length > 0 ? (
            <ol className="border-edge mt-4 list-none space-y-6 border-l pl-4">
              {replies.map((reply) => (
                <li key={reply.id}>
                  <article>
                    <CommentBody comment={reply} />
                  </article>
                </li>
              ))}
            </ol>
          ) : null}
        </article>
      </li>
    ))}
  </ol>
);
