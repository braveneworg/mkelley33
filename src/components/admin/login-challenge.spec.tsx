/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { ForwardedRef, ReactNode } from 'react';
import { forwardRef, useImperativeHandle, useState } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LoginChallenge } from '@/components/admin/login-challenge';
import { TURNSTILE_TEST_SITE_KEY } from '@/lib/turnstile/site-key';

const resetSpy = vi.hoisted(() => vi.fn());
const setValueSpy = vi.hoisted(() => vi.fn());
/** What Payload's form reports, set by a test before it renders again. */
const form = vi.hoisted(() => ({ path: '', processing: false, theme: 'light' }));

interface MockTurnstileProps {
  onError?: () => void;
  onExpire?: () => void;
  onSuccess?: (token: string) => void;
  options?: { size?: string; theme?: string };
  siteKey: string;
}

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: forwardRef(function Turnstile(
    { onError, onExpire, onSuccess, options, siteKey }: MockTurnstileProps,
    ref: ForwardedRef<{ reset: () => void }>
  ) {
    useImperativeHandle(ref, () => ({ reset: resetSpy }));
    return (
      <div
        data-site-key={siteKey}
        data-size={options?.size}
        data-testid="turnstile"
        data-theme={options?.theme}
      >
        <button onClick={() => onSuccess?.('test-token')} type="button">
          solve turnstile
        </button>
        <button onClick={() => onExpire?.()} type="button">
          expire turnstile
        </button>
        <button onClick={() => onError?.()} type="button">
          break turnstile
        </button>
      </div>
    );
  }),
}));

// Payload's form, cut down to the three things the challenge asks of it: a
// field to keep the token in, whether a sign-in is in flight, and a submit.
vi.mock('@payloadcms/ui', () => ({
  FormSubmit: ({ children, disabled }: { children: ReactNode; disabled?: boolean }) => (
    <button disabled={disabled} type="submit">
      {children}
    </button>
  ),
  useField: ({ path }: { path: string }) => {
    const [value, setValue] = useState('');
    form.path = path;
    return {
      formProcessing: form.processing,
      setValue: (next: string) => {
        setValueSpy(next);
        setValue(next);
      },
      value,
    };
  },
  useTheme: () => ({ theme: form.theme }),
  useTranslation: () => ({ t: (key: string) => key }),
}));

const signInButton = (): HTMLElement =>
  screen.getByRole('button', { name: 'authentication:login' });

const solve = (): Promise<void> =>
  userEvent.click(screen.getByRole('button', { name: 'solve turnstile' }));

/** A sign-in goes out and comes back, as the form reports it. */
const attemptSignIn = (rerender: (ui: ReactNode) => void): void => {
  form.processing = true;
  rerender(<LoginChallenge />);
  form.processing = false;
  rerender(<LoginChallenge />);
};

beforeEach(() => {
  vi.clearAllMocks();
  form.processing = false;
  form.theme = 'light';
});

describe('LoginChallenge', () => {
  it('renders the widget with the site key', () => {
    render(<LoginChallenge />);

    expect(screen.getByTestId('turnstile')).toHaveAttribute(
      'data-site-key',
      TURNSTILE_TEST_SITE_KEY
    );
  });

  it('keeps the token in the field the server reads it from', () => {
    render(<LoginChallenge />);

    expect(form.path).toBe('turnstileToken');
  });

  it('holds the sign-in button back until the challenge is passed', () => {
    render(<LoginChallenge />);

    expect(signInButton()).toBeDisabled();
  });

  it('opens the sign-in button once the challenge is passed', async () => {
    render(<LoginChallenge />);

    await solve();

    expect(signInButton()).toBeEnabled();
  });

  it('puts the token Cloudflare issued into the form', async () => {
    render(<LoginChallenge />);

    await solve();

    expect(setValueSpy).toHaveBeenLastCalledWith('test-token');
  });

  it('holds the sign-in button back again when the token expires', async () => {
    render(<LoginChallenge />);
    await solve();

    await userEvent.click(screen.getByRole('button', { name: 'expire turnstile' }));

    expect(signInButton()).toBeDisabled();
  });

  // A token is good for one check. Whatever the sign-in came back with, the
  // one it carried is spent, so the next attempt needs its own.
  it('asks Cloudflare for a fresh token after a sign-in comes back', async () => {
    const { rerender } = render(<LoginChallenge />);
    await solve();

    attemptSignIn(rerender);

    expect(resetSpy).toHaveBeenCalledTimes(1);
  });

  it('drops the spent token after a sign-in comes back', async () => {
    const { rerender } = render(<LoginChallenge />);
    await solve();

    attemptSignIn(rerender);

    expect(signInButton()).toBeDisabled();
  });

  it('leaves the widget alone before any sign-in was attempted', async () => {
    const { rerender } = render(<LoginChallenge />);
    await solve();

    rerender(<LoginChallenge />);

    expect(resetSpy).not.toHaveBeenCalled();
  });

  it('says so when the security check cannot run', async () => {
    render(<LoginChallenge />);

    await userEvent.click(screen.getByRole('button', { name: 'break turnstile' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/security check could not load/i);
  });

  it('says nothing while the security check is working', () => {
    render(<LoginChallenge />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('takes the message away once the challenge is passed after all', async () => {
    render(<LoginChallenge />);
    await userEvent.click(screen.getByRole('button', { name: 'break turnstile' }));

    await solve();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('draws the widget in the admin theme', () => {
    form.theme = 'dark';

    render(<LoginChallenge />);

    expect(screen.getByTestId('turnstile')).toHaveAttribute('data-theme', 'dark');
  });

  it('lets the widget fill the width of the form', () => {
    render(<LoginChallenge />);

    expect(screen.getByTestId('turnstile')).toHaveAttribute('data-size', 'flexible');
  });
});
