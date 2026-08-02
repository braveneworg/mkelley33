/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { threadComments } from '@/lib/thread-comments';
import { makeComment } from '@/test/make-comment';

describe('threadComments', () => {
  it('keeps top-level comments in their given order', () => {
    const a = makeComment({ id: 'a' });
    const b = makeComment({ id: 'b' });

    const threads = threadComments([a, b]);

    expect(threads.map((t) => t.comment.id)).toEqual(['a', 'b']);
  });

  it('groups replies under their parent thread', () => {
    const a = makeComment({ id: 'a' });
    const b = makeComment({ id: 'b' });
    const replyToA = makeComment({ id: 'r1', parent: 'a' });

    const threads = threadComments([a, b, replyToA]);

    expect(threads.find((t) => t.comment.id === 'a')?.replies.map((r) => r.id)).toEqual(['r1']);
    expect(threads.map((t) => t.comment.id)).toEqual(['a', 'b']);
  });

  it('resolves a populated parent object to its id', () => {
    const a = makeComment({ id: 'a' });
    const reply = makeComment({ id: 'r1', parent: makeComment({ id: 'a' }) });

    const threads = threadComments([a, reply]);

    expect(threads.find((t) => t.comment.id === 'a')?.replies.map((r) => r.id)).toEqual(['r1']);
  });

  it('promotes an orphaned reply to top level instead of dropping it', () => {
    const a = makeComment({ id: 'a' });
    const orphan = makeComment({ id: 'r1', parent: 'not-in-the-approved-set' });

    const threads = threadComments([a, orphan]);

    expect(threads.map((t) => t.comment.id)).toEqual(['a', 'r1']);
  });

  it('starts every thread with no replies', () => {
    const threads = threadComments([makeComment({ id: 'a' })]);

    expect(threads[0]?.replies).toEqual([]);
  });
});
