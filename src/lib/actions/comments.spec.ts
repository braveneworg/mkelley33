/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

/**
 * Only what is specific to this action: the repository it writes, the
 * notification it builds, and the messages it hands the pipeline. The
 * pipeline itself — honeypot ordering, Turnstile before persistence,
 * tolerance of a failed notification, the catch path — is covered once in
 * `run-form-submission.spec.ts` and is not re-tested here.
 */

import { submitComment } from '@/lib/actions/comments';
import { sendEmail } from '@/lib/email/transport';
import { createComment } from '@/lib/repositories/comments';
import { getPublishedPostById } from '@/lib/repositories/posts';
import { verifyTurnstileToken } from '@/lib/turnstile/verify';

vi.mock('@/lib/email/transport', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/lib/repositories/comments', () => ({
  createComment: vi.fn().mockResolvedValue({ id: 'c1', status: 'pending' }),
}));
vi.mock('@/lib/repositories/posts', () => ({
  getPublishedPostById: vi.fn().mockResolvedValue({ id: 'post-1', title: 'Hello World' }),
}));
vi.mock('@/lib/turnstile/verify', () => ({
  verifyTurnstileToken: vi.fn().mockResolvedValue(true),
}));

const valid = {
  authorEmail: '',
  authorName: 'Ada',
  body: 'Great write-up — saved me an afternoon.',
  parentId: '',
  postId: 'post-1',
  turnstileToken: 'tok',
  website: '',
};

beforeEach(() => {
  vi.mocked(verifyTurnstileToken).mockResolvedValue(true);
  vi.mocked(getPublishedPostById).mockResolvedValue({
    id: 'post-1',
    title: 'Hello World',
  } as never);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('submitComment', () => {
  it('persists with empty-string sentinels normalized to absent', async () => {
    await expect(submitComment(valid)).resolves.toEqual({ success: true });
    expect(createComment).toHaveBeenCalledWith({
      authorEmail: undefined,
      authorName: 'Ada',
      body: 'Great write-up — saved me an afternoon.',
      parentId: undefined,
      postId: 'post-1',
    });
  });

  it('passes the email and parent through when provided', async () => {
    await submitComment({ ...valid, authorEmail: 'ada@example.com', parentId: 'parent-1' });
    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({ authorEmail: 'ada@example.com', parentId: 'parent-1' })
    );
  });

  it('emails the owner a moderation link for the stored comment', async () => {
    await submitComment(valid);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('Hello World'),
        text: expect.stringContaining('/admin/collections/comments/c1'),
        to: 'me@mkelley33.com',
      })
    );
  });

  it('still notifies with a fallback title when the post lookup misses', async () => {
    vi.mocked(getPublishedPostById).mockResolvedValue(null);
    await expect(submitComment(valid)).resolves.toEqual({ success: true });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining('a post') })
    );
  });

  it('asks the user to fix the highlighted fields when input is invalid', async () => {
    await expect(submitComment({ ...valid, authorEmail: 'nope' })).resolves.toEqual({
      error: 'check the highlighted fields and retry',
      success: false,
    });
  });

  it('returns the failure copy when storage throws', async () => {
    vi.mocked(createComment).mockRejectedValueOnce(new Error('db down'));
    await expect(submitComment(valid)).resolves.toEqual({
      error: 'something broke — retry in a bit',
      success: false,
    });
  });
});
