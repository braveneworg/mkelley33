/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen, within } from '@testing-library/react';

import { CommentList } from '@/components/blog/comment-list';
import { threadComments } from '@/lib/thread-comments';
import { makeComment } from '@/test/make-comment';

describe('CommentList', () => {
  it('renders author names and bodies', () => {
    const threads = threadComments([
      makeComment({ authorName: 'Ada', body: 'First!', id: 'a' }),
      makeComment({ authorName: 'Grace', body: 'Second!', id: 'b' }),
    ]);
    render(<CommentList postId="post-1" threads={threads} />);
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Second!')).toBeInTheDocument();
  });

  it('preserves line breaks in the body', () => {
    const threads = threadComments([makeComment({ body: 'line one\nline two', id: 'a' })]);
    render(<CommentList postId="post-1" threads={threads} />);
    expect(screen.getByText(/line one/)).toHaveClass('whitespace-pre-wrap');
  });

  it('renders the comment date as a time element', () => {
    const threads = threadComments([
      makeComment({ createdAt: '2024-03-01T12:34:56.000Z', id: 'a' }),
    ]);
    render(<CommentList postId="post-1" threads={threads} />);
    expect(screen.getByText('2024-03-01')).toBeInTheDocument();
  });

  it('nests replies inside their parent item', () => {
    const threads = threadComments([
      makeComment({ authorName: 'Ada', id: 'a' }),
      makeComment({ authorName: 'Grace', body: 'replying', id: 'r1', parent: 'a' }),
    ]);
    render(<CommentList postId="post-1" threads={threads} />);
    const parentItem = screen.getByText('Ada').closest('li');
    expect(within(parentItem as HTMLElement).getByText('replying')).toBeInTheDocument();
  });

  it('offers reply only on top-level comments', () => {
    const threads = threadComments([
      makeComment({ id: 'a' }),
      makeComment({ id: 'r1', parent: 'a' }),
      makeComment({ id: 'b' }),
    ]);
    render(<CommentList postId="post-1" threads={threads} />);
    expect(screen.getAllByRole('button', { name: 'reply' })).toHaveLength(2);
  });
});
