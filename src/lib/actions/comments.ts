/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use server';

import { runFormSubmission } from '@/lib/actions/run-form-submission';
import type { ActionResult } from '@/lib/actions/types';
import { commentNotificationEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/transport';
import { createComment } from '@/lib/repositories/comments';
import { getPublishedPostById } from '@/lib/repositories/posts';
import { siteConfig } from '@/lib/site-config';
import type { CommentFormValues } from '@/lib/validation/comments';
import { commentSchema } from '@/lib/validation/comments';

interface PersistedComment {
  commentId: string;
  postTitle: string;
}

/**
 * Stores the pending comment and resolves the post title for the
 * notification. The title lookup swallows failures (repository read paths
 * return null), so once the comment is stored nothing here can push the
 * user onto the retry path and invite a duplicate.
 */
const persistComment = async (values: CommentFormValues): Promise<PersistedComment> => {
  const comment = await createComment({
    authorEmail: values.authorEmail === '' ? undefined : values.authorEmail,
    authorName: values.authorName,
    body: values.body,
    parentId: values.parentId === '' ? undefined : values.parentId,
    postId: values.postId,
  });
  const post = await getPublishedPostById(values.postId);
  return { commentId: comment.id, postTitle: post?.title ?? 'a post' };
};

const emailOwner = async (
  values: CommentFormValues,
  persisted: PersistedComment
): Promise<void> => {
  const email = commentNotificationEmail({
    authorEmail: values.authorEmail,
    authorName: values.authorName,
    body: values.body,
    moderateUrl: `${siteConfig.url}/admin/collections/comments/${persisted.commentId}`,
    postTitle: persisted.postTitle,
  });
  await sendEmail({ ...email, to: process.env.CONTACT_TO ?? 'me@mkelley33.com' });
};

export const submitComment = async (input: unknown): Promise<ActionResult> =>
  runFormSubmission({
    failureError: 'something broke — retry in a bit',
    input,
    invalidInputError: 'check the highlighted fields and retry',
    label: 'submitComment',
    notify: emailOwner,
    persist: persistComment,
    schema: commentSchema,
  });
