/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CommentReplyControl } from '@/components/blog/comment-reply-control';

vi.mock('@/components/blog/comment-form', () => ({
  CommentForm: ({ parentId, postId }: { parentId?: string; postId: string }) => (
    <p>{`stub form post=${postId} parent=${parentId ?? 'none'}`}</p>
  ),
}));

describe('CommentReplyControl', () => {
  it('starts closed with no form mounted', () => {
    render(<CommentReplyControl parentId="comment-9" postId="post-1" />);
    expect(screen.queryByText(/stub form/)).not.toBeInTheDocument();
  });

  it('opens a reply form wired to the parent comment', async () => {
    const user = userEvent.setup();
    render(<CommentReplyControl parentId="comment-9" postId="post-1" />);
    await user.click(screen.getByRole('button', { name: 'reply' }));
    expect(screen.getByText('stub form post=post-1 parent=comment-9')).toBeInTheDocument();
  });

  it('exposes the open state on the toggle', async () => {
    const user = userEvent.setup();
    render(<CommentReplyControl parentId="comment-9" postId="post-1" />);
    const toggle = screen.getByRole('button', { name: 'reply' });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes again from the toggle', async () => {
    const user = userEvent.setup();
    render(<CommentReplyControl parentId="comment-9" postId="post-1" />);
    await user.click(screen.getByRole('button', { name: 'reply' }));
    await user.click(screen.getByRole('button', { name: 'cancel' }));
    expect(screen.queryByText(/stub form/)).not.toBeInTheDocument();
  });
});
