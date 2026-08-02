/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { CommentsSection } from '@/components/blog/comments-section';
import { makeComment } from '@/test/make-comment';

vi.mock('@/components/blog/comment-form', () => ({
  CommentForm: ({ parentId, postId }: { parentId?: string; postId: string }) => (
    <p>{`stub form post=${postId} parent=${parentId ?? 'none'}`}</p>
  ),
}));

describe('CommentsSection', () => {
  it('labels the section with the comment count', () => {
    render(
      <CommentsSection
        comments={[makeComment({ id: 'a' }), makeComment({ id: 'b' })]}
        postId="post-1"
      />
    );
    expect(screen.getByRole('heading', { name: /comments \(2\)/ })).toBeInTheDocument();
  });

  it('shows the empty state when nobody has commented', () => {
    render(<CommentsSection comments={[]} postId="post-1" />);
    expect(screen.getByText(/no comments yet/)).toBeInTheDocument();
  });

  it('renders the approved comments', () => {
    render(
      <CommentsSection comments={[makeComment({ authorName: 'Ada', id: 'a' })]} postId="post-1" />
    );
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('always offers the top-level comment form', () => {
    render(<CommentsSection comments={[]} postId="post-1" />);
    expect(screen.getByText('stub form post=post-1 parent=none')).toBeInTheDocument();
  });
});
