/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { ForwardedRef } from 'react';
import { forwardRef, useImperativeHandle } from 'react';

import { Turnstile } from '@marsidev/react-turnstile';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';

import { useGuardedForm } from '@/components/forms/use-guarded-form';
import type { ActionResult } from '@/lib/actions/types';

/**
 * The contract every spam-gated form shares lives here, so the contact and
 * newsletter specs cover only their own fields and copy.
 */

const resetSpy = vi.hoisted(() => vi.fn());

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: forwardRef(function Turnstile(
    { onExpire, onSuccess }: { onExpire?: () => void; onSuccess?: (token: string) => void },
    ref: ForwardedRef<{ reset: () => void }>
  ) {
    useImperativeHandle(ref, () => ({ reset: resetSpy }));
    return (
      <>
        <button onClick={() => onSuccess?.('test-token')} type="button">
          solve turnstile
        </button>
        <button onClick={() => onExpire?.()} type="button">
          expire turnstile
        </button>
      </>
    );
  }),
}));

const schema = z.object({
  email: z.email('enter a valid email'),
  turnstileToken: z.string().min(1, 'verification incomplete'),
  website: z.literal(''),
});

type TestValues = z.infer<typeof schema>;

const submit = vi.fn<(values: TestValues) => Promise<ActionResult>>();

const TestForm = () => {
  const { form, isPending, onSubmit, serverError, succeeded, turnstileProps } =
    useGuardedForm<TestValues>({
      defaultValues: { email: '', turnstileToken: '', website: '' },
      schema,
      submit,
    });

  if (succeeded) {
    return <p role="status">sent</p>;
  }

  return (
    <form noValidate onSubmit={onSubmit}>
      <label htmlFor="test-email">email</label>
      <input id="test-email" {...form.register('email')} />
      <p>{form.formState.errors.email?.message}</p>
      <p>{form.formState.errors.turnstileToken?.message}</p>
      <Turnstile {...turnstileProps} />
      {serverError ? <p role="alert">{serverError}</p> : null}
      <button disabled={isPending} type="submit">
        send
      </button>
    </form>
  );
};

const fillAndSubmit = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText('email'), 'ada@example.com');
  await user.click(screen.getByRole('button', { name: 'solve turnstile' }));
  await user.click(screen.getByRole('button', { name: 'send' }));
};

beforeEach(() => {
  submit.mockResolvedValue({ success: true });
});

describe('useGuardedForm', () => {
  it('submits the parsed values and switches to the success state', async () => {
    const user = userEvent.setup();
    render(<TestForm />);
    await fillAndSubmit(user);
    expect(await screen.findByRole('status')).toHaveTextContent('sent');
    expect(submit).toHaveBeenCalledWith({
      email: 'ada@example.com',
      turnstileToken: 'test-token',
      website: '',
    });
  });

  it('never calls the action when the schema rejects the values', async () => {
    const user = userEvent.setup();
    render(<TestForm />);
    await user.type(screen.getByLabelText('email'), 'nope');
    await user.click(screen.getByRole('button', { name: 'send' }));
    expect(await screen.findByText('enter a valid email')).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it('surfaces the error the action returned', async () => {
    submit.mockResolvedValue({ error: 'verification failed', success: false });
    const user = userEvent.setup();
    render(<TestForm />);
    await fillAndSubmit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('verification failed');
  });

  it('resets the turnstile widget after a failed submission', async () => {
    submit.mockResolvedValue({ error: 'verification failed', success: false });
    const user = userEvent.setup();
    render(<TestForm />);
    await fillAndSubmit(user);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(resetSpy).toHaveBeenCalled();
  });

  it('keeps what the user typed after a failed submission', async () => {
    submit.mockResolvedValue({ error: 'verification failed', success: false });
    const user = userEvent.setup();
    render(<TestForm />);
    await fillAndSubmit(user);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText('email')).toHaveValue('ada@example.com');
  });

  it('clears the spent token so it cannot be resubmitted', async () => {
    submit.mockResolvedValue({ error: 'verification failed', success: false });
    const user = userEvent.setup();
    render(<TestForm />);
    await fillAndSubmit(user);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'send' }));
    expect(await screen.findByText('verification incomplete')).toBeInTheDocument();
    expect(submit).toHaveBeenCalledOnce();
  });

  it('clears an expired token before it reaches the action', async () => {
    const user = userEvent.setup();
    render(<TestForm />);
    await user.type(screen.getByLabelText('email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'solve turnstile' }));
    await user.click(screen.getByRole('button', { name: 'expire turnstile' }));
    await user.click(screen.getByRole('button', { name: 'send' }));
    expect(await screen.findByText('verification incomplete')).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it('clears a stale error when the next attempt succeeds', async () => {
    submit.mockResolvedValueOnce({ error: 'verification failed', success: false });
    const user = userEvent.setup();
    render(<TestForm />);
    await fillAndSubmit(user);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'solve turnstile' }));
    await user.click(screen.getByRole('button', { name: 'send' }));
    expect(await screen.findByRole('status')).toHaveTextContent('sent');
  });
});
