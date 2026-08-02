/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { ForwardedRef } from 'react';
import { forwardRef, useImperativeHandle } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CommentForm } from '@/components/blog/comment-form';
import { submitComment } from '@/lib/actions/comments';

/**
 * This form's own concerns: its fields, the queued-for-moderation copy, and
 * the parent it threads under. The submit contract it shares with the other
 * public forms — server errors, retiring a spent Turnstile token — is
 * covered in the `useGuardedForm` spec.
 */

const resetSpy = vi.hoisted(() => vi.fn());

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: forwardRef(function Turnstile(
    { onSuccess }: { onSuccess?: (token: string) => void },
    ref: ForwardedRef<{ reset: () => void }>
  ) {
    useImperativeHandle(ref, () => ({ reset: resetSpy }));
    return (
      <button onClick={() => onSuccess?.('test-token')} type="button">
        solve turnstile
      </button>
    );
  }),
}));
vi.mock('@/lib/actions/comments', () => ({
  submitComment: vi.fn().mockResolvedValue({ success: true }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const fillAndSubmit = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText('name'), 'Ada');
  await user.type(screen.getByLabelText('comment'), 'Loved the worktree tip.');
  await user.click(screen.getByRole('button', { name: 'solve turnstile' }));
  await user.click(screen.getByRole('button', { name: /post comment/ }));
};

describe('CommentForm', () => {
  it('submits a top-level comment and shows the moderation-queue state', async () => {
    const user = userEvent.setup();
    render(<CommentForm postId="post-1" />);
    await fillAndSubmit(user);
    expect(await screen.findByText(/appears once approved/)).toBeInTheDocument();
    expect(submitComment).toHaveBeenCalledWith(
      expect.objectContaining({
        authorName: 'Ada',
        parentId: '',
        postId: 'post-1',
        turnstileToken: 'test-token',
      })
    );
  });

  it('threads under the given parent', async () => {
    const user = userEvent.setup();
    render(<CommentForm parentId="comment-9" postId="post-1" />);
    await fillAndSubmit(user);
    expect(submitComment).toHaveBeenCalledWith(expect.objectContaining({ parentId: 'comment-9' }));
  });

  it('submits fine without the optional email', async () => {
    const user = userEvent.setup();
    render(<CommentForm postId="post-1" />);
    await fillAndSubmit(user);
    expect(submitComment).toHaveBeenCalledWith(expect.objectContaining({ authorEmail: '' }));
  });

  it('shows a validation error for a bad email without calling the action', async () => {
    const user = userEvent.setup();
    render(<CommentForm postId="post-1" />);
    await user.type(screen.getByLabelText('name'), 'Ada');
    await user.type(screen.getByLabelText(/email/), 'nope');
    await user.type(screen.getByLabelText('comment'), 'Loved the worktree tip.');
    await user.click(screen.getByRole('button', { name: /post comment/ }));
    expect(await screen.findByText(/enter a valid email/)).toBeInTheDocument();
    expect(submitComment).not.toHaveBeenCalled();
  });

  it('requires a name', async () => {
    const user = userEvent.setup();
    render(<CommentForm postId="post-1" />);
    await user.type(screen.getByLabelText('comment'), 'Loved the worktree tip.');
    await user.click(screen.getByRole('button', { name: /post comment/ }));
    expect(await screen.findByText(/name is required/)).toBeInTheDocument();
    expect(submitComment).not.toHaveBeenCalled();
  });

  it('surfaces the server error and stays submittable', async () => {
    vi.mocked(submitComment).mockResolvedValueOnce({
      error: 'something broke — retry in a bit',
      success: false,
    });
    const user = userEvent.setup();
    render(<CommentForm postId="post-1" />);
    await fillAndSubmit(user);
    expect(await screen.findByText(/something broke/)).toBeInTheDocument();
    expect(screen.queryByText(/appears once approved/)).not.toBeInTheDocument();
  });
});
