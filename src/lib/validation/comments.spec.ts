/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { commentSchema } from '@/lib/validation/comments';

const valid = {
  authorEmail: '',
  authorName: 'Ada',
  body: 'Great write-up — the worktree tip alone saved me an afternoon.',
  parentId: '',
  postId: 'post-1',
  turnstileToken: 'tok',
  website: '',
};

describe('commentSchema', () => {
  it('accepts a minimal valid submission', () => {
    expect(commentSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a real email and a parent id', () => {
    const ok = commentSchema.safeParse({
      ...valid,
      authorEmail: 'a@b.com',
      parentId: 'comment-1',
    });
    expect(ok.success).toBe(true);
  });

  it('rejects a malformed email', () => {
    expect(commentSchema.safeParse({ ...valid, authorEmail: 'nope' }).success).toBe(false);
  });

  it('rejects a missing or overlong name', () => {
    expect(commentSchema.safeParse({ ...valid, authorName: '  ' }).success).toBe(false);
    expect(commentSchema.safeParse({ ...valid, authorName: 'a'.repeat(81) }).success).toBe(false);
  });

  it('rejects a body that is too short or too long', () => {
    expect(commentSchema.safeParse({ ...valid, body: 'k' }).success).toBe(false);
    expect(commentSchema.safeParse({ ...valid, body: 'x'.repeat(2001) }).success).toBe(false);
  });

  it('rejects a body with more than two links', () => {
    const spam = 'see https://a.example and https://b.example and http://c.example';
    expect(commentSchema.safeParse({ ...valid, body: spam }).success).toBe(false);
  });

  it('accepts a body with two links', () => {
    const fine = 'compare https://a.example with https://b.example — night and day';
    expect(commentSchema.safeParse({ ...valid, body: fine }).success).toBe(true);
  });

  it('rejects a missing post id', () => {
    expect(commentSchema.safeParse({ ...valid, postId: '' }).success).toBe(false);
  });

  it('rejects an empty turnstile token', () => {
    expect(commentSchema.safeParse({ ...valid, turnstileToken: '' }).success).toBe(false);
  });

  it('rejects a filled honeypot', () => {
    expect(commentSchema.safeParse({ ...valid, website: 'spam.example' }).success).toBe(false);
  });
});
