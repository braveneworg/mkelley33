/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { ForwardedRef } from 'react';
import { forwardRef, useImperativeHandle } from 'react';

import { Turnstile } from '@marsidev/react-turnstile';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';

import { useGuardedForm } from '@/components/forms/use-guarded-form';
import type { ActionResult } from '@/lib/actions/types';

/**
 * The contract every spam-gated form shares lives here, so the contact,
 * newsletter, and comment specs cover only their own fields and copy.
 */

const resetSpy = vi.hoisted(() => vi.fn());
const executeSpy = vi.hoisted(() => vi.fn());
/** The mounted widget's `onWidgetLoad`, so a test can decide when Cloudflare "finishes loading". */
const widgetLoad = vi.hoisted(() => ({ current: undefined as (() => void) | undefined }));

interface MockTurnstileProps {
  onExpire?: () => void;
  onSuccess?: (token: string) => void;
  onWidgetLoad?: (widgetId: string) => void;
  options?: { appearance?: string; execution?: string };
}

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: forwardRef(function Turnstile(
    { onExpire, onSuccess, onWidgetLoad, options }: MockTurnstileProps,
    ref: ForwardedRef<{ execute: () => void; reset: () => void }>
  ) {
    useImperativeHandle(ref, () => ({ execute: executeSpy, reset: resetSpy }));
    widgetLoad.current = () => onWidgetLoad?.('widget-id');
    return (
      <div
        data-appearance={options?.appearance}
        data-execution={options?.execution}
        data-testid="turnstile"
      >
        <button onClick={() => onSuccess?.('test-token')} type="button">
          solve turnstile
        </button>
        <button onClick={() => onExpire?.()} type="button">
          expire turnstile
        </button>
      </div>
    );
  }),
}));

/** Cloudflare's script has rendered the widget — the common case, before the visitor types. */
const loadWidget = (): void => {
  act(() => widgetLoad.current?.());
};

const schema = z.object({
  email: z.email('enter a valid email'),
  turnstileToken: z.string().min(1, 'verification incomplete'),
  website: z.literal(''),
});

type TestValues = z.infer<typeof schema>;

const submit = vi.fn<(values: TestValues) => Promise<ActionResult>>();

const TestForm = () => {
  const { form, isPending, onFocus, onSubmit, serverError, succeeded, turnstileProps } =
    useGuardedForm<TestValues>({
      defaultValues: { email: '', turnstileToken: '', website: '' },
      schema,
      submit,
    });

  if (succeeded) {
    return <p role="status">sent</p>;
  }

  return (
    <form noValidate onFocus={onFocus} onSubmit={onSubmit}>
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
  vi.clearAllMocks();
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

/**
 * The challenge is deferred to the visitor's first interaction with the form.
 * Rendering it eagerly meant every page view issued a challenge — crawlers
 * included — while only a submission ever verified one, and a five-minute
 * token spent itself while the visitor was still reading.
 */
describe('useGuardedForm challenge timing', () => {
  it('renders the widget in execute mode so nothing runs on page load', () => {
    render(<TestForm />);
    expect(screen.getByTestId('turnstile')).toHaveAttribute('data-execution', 'execute');
  });

  it('keeps the widget invisible unless cloudflare needs an interaction', () => {
    render(<TestForm />);
    expect(screen.getByTestId('turnstile')).toHaveAttribute('data-appearance', 'interaction-only');
  });

  it('does not run the challenge before the visitor touches the form', () => {
    render(<TestForm />);
    loadWidget();
    expect(executeSpy).not.toHaveBeenCalled();
  });

  it('runs the challenge when a field first receives focus', async () => {
    const user = userEvent.setup();
    render(<TestForm />);
    loadWidget();
    await user.click(screen.getByLabelText('email'));
    expect(executeSpy).toHaveBeenCalledOnce();
  });

  it('runs the challenge once, however many fields the visitor focuses', async () => {
    const user = userEvent.setup();
    render(<TestForm />);
    loadWidget();
    await user.click(screen.getByLabelText('email'));
    await user.tab();
    await user.tab();
    expect(executeSpy).toHaveBeenCalledOnce();
  });

  /**
   * react-turnstile's `execute()` is a silent no-op until the widget has
   * rendered, so a visitor faster than Cloudflare's script would otherwise
   * never be challenged and never get a token.
   */
  it('waits for the widget to load when the visitor gets there first', async () => {
    const user = userEvent.setup();
    render(<TestForm />);
    await user.click(screen.getByLabelText('email'));
    expect(executeSpy).not.toHaveBeenCalled();
    loadWidget();
    expect(executeSpy).toHaveBeenCalledOnce();
  });

  it('runs the challenge again after a failed submission, so a retry can get a fresh token', async () => {
    submit.mockResolvedValue({ error: 'verification failed', success: false });
    const user = userEvent.setup();
    render(<TestForm />);
    loadWidget();
    await fillAndSubmit(user);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(executeSpy).toHaveBeenCalledTimes(2);
  });

  it('resets the widget before running the challenge again', async () => {
    submit.mockResolvedValue({ error: 'verification failed', success: false });
    const user = userEvent.setup();
    render(<TestForm />);
    loadWidget();
    await fillAndSubmit(user);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    const [resetOrder] = resetSpy.mock.invocationCallOrder;
    const [, reExecuteOrder] = executeSpy.mock.invocationCallOrder;
    expect(resetOrder).toBeLessThan(reExecuteOrder);
  });
});
