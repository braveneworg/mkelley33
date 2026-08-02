/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import { useState } from 'react';

import { CommentForm } from '@/components/blog/comment-form';

export interface CommentReplyControlProps {
  parentId: string;
  postId: string;
}

/**
 * Lazily mounts a reply form so its Turnstile widget only loads once a
 * reader actually opens the reply — tokens are per-widget and per-use.
 */
export const CommentReplyControl = ({ parentId, postId }: CommentReplyControlProps) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        aria-expanded={open}
        className="text-fg-muted hover:text-phosphor font-mono text-xs transition-colors"
        onClick={() => setOpen(!open)}
        type="button"
      >
        {open ? 'cancel' : 'reply'}
      </button>
      {open ? (
        <div className="mt-3">
          <CommentForm parentId={parentId} postId={postId} />
        </div>
      ) : null}
    </div>
  );
};
