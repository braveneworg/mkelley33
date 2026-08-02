/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { ForwardedRef } from 'react';
import { forwardRef, useImperativeHandle } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { NewsletterForm } from '@/components/newsletter/newsletter-form';
import { subscribeNewsletter } from '@/lib/actions/newsletter';

/**
 * This form's own concerns: its single field and its confirmation copy. The
 * submit contract it shares with the contact form — server errors, retiring a
 * spent Turnstile token — is covered in the `useGuardedForm` spec.
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
vi.mock('@/lib/actions/newsletter', () => ({
  subscribeNewsletter: vi.fn().mockResolvedValue({ success: true }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('NewsletterForm', () => {
  it('submits and shows the check-your-inbox state', async () => {
    const user = userEvent.setup();
    render(<NewsletterForm />);
    await user.type(screen.getByLabelText('email'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: 'solve turnstile' }));
    await user.click(screen.getByRole('button', { name: /subscribe/ }));
    expect(await screen.findByText(/check your inbox to confirm/)).toBeInTheDocument();
    expect(subscribeNewsletter).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.com', turnstileToken: 'test-token' })
    );
  });

  it('shows a validation error for a bad email without calling the action', async () => {
    const user = userEvent.setup();
    render(<NewsletterForm />);
    await user.type(screen.getByLabelText('email'), 'nope');
    await user.click(screen.getByRole('button', { name: /subscribe/ }));
    expect(await screen.findByText(/enter a valid email/)).toBeInTheDocument();
    expect(subscribeNewsletter).not.toHaveBeenCalled();
  });
});
