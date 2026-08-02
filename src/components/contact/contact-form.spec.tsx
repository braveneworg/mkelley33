/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { ForwardedRef } from 'react';
import { forwardRef, useImperativeHandle } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ContactForm } from '@/components/contact/contact-form';
import { submitContact } from '@/lib/actions/contact';

/**
 * This form's own concerns: the services picker, the deep link, and the error
 * wiring. Submitting, surfacing a server error, and retiring a spent Turnstile
 * token belong to `useGuardedForm` and are covered in its spec.
 */

const searchParams = { value: new URLSearchParams() };
const resetSpy = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams.value,
}));
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
vi.mock('@/lib/actions/contact', () => ({
  submitContact: vi.fn().mockResolvedValue({ success: true }),
}));

const services = [
  { name: 'AI enablement', slug: 'ai-enablement' },
  { name: 'Product development', slug: 'product-dev' },
];

beforeEach(() => {
  vi.clearAllMocks();
  searchParams.value = new URLSearchParams();
});

describe('ContactForm', () => {
  it('renders the core fields and no services picker for general reason', () => {
    render(<ContactForm services={services} />);
    expect(screen.getByLabelText('name')).toBeInTheDocument();
    expect(screen.getByLabelText('email')).toBeInTheDocument();
    expect(screen.getByLabelText('reason')).toHaveValue('general');
    expect(screen.getByLabelText('message')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /select services/ })).not.toBeInTheDocument();
  });

  it('shows field errors on empty submit', async () => {
    const user = userEvent.setup();
    render(<ContactForm services={services} />);
    await user.click(screen.getByRole('button', { name: /send-message/ }));
    expect(await screen.findByText('name is required')).toBeInTheDocument();
    expect(submitContact).not.toHaveBeenCalled();
  });

  it('picks services in the dialog and renders removable chips', async () => {
    const user = userEvent.setup();
    render(<ContactForm services={services} />);
    await user.selectOptions(screen.getByLabelText('reason'), 'services');
    await user.click(screen.getByRole('button', { name: /select services/ }));
    await user.click(screen.getByRole('checkbox', { name: 'AI enablement' }));
    await user.click(screen.getByRole('button', { name: 'done' }));
    expect(screen.getByText('AI enablement')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'remove AI enablement' }));
    expect(screen.queryByText('AI enablement')).not.toBeInTheDocument();
  });

  it('clears selected services when the reason leaves services', async () => {
    const user = userEvent.setup();
    render(<ContactForm services={services} />);
    await user.selectOptions(screen.getByLabelText('reason'), 'services');
    await user.click(screen.getByRole('button', { name: /select services/ }));
    await user.click(screen.getByRole('checkbox', { name: 'AI enablement' }));
    await user.click(screen.getByRole('button', { name: 'done' }));
    expect(screen.getByText('AI enablement')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('reason'), 'general');
    expect(screen.queryByText('AI enablement')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('name'), 'Ada');
    await user.type(screen.getByLabelText('email'), 'ada@example.com');
    await user.type(
      screen.getByLabelText('message'),
      'Help my team adopt AI-assisted development.'
    );
    await user.click(screen.getByRole('button', { name: 'solve turnstile' }));
    await user.click(screen.getByRole('button', { name: /send-message/ }));
    expect(await screen.findByText(/message queued/)).toBeInTheDocument();
    expect(submitContact).toHaveBeenCalledWith(expect.objectContaining({ requestedServices: [] }));
  });

  it('submits the happy path and shows the queued confirmation', async () => {
    const user = userEvent.setup();
    render(<ContactForm services={services} />);
    await user.type(screen.getByLabelText('name'), 'Ada');
    await user.type(screen.getByLabelText('email'), 'ada@example.com');
    await user.type(
      screen.getByLabelText('message'),
      'Help my team adopt AI-assisted development.'
    );
    await user.click(screen.getByRole('button', { name: 'solve turnstile' }));
    await user.click(screen.getByRole('button', { name: /send-message/ }));
    expect(await screen.findByText(/message queued/)).toBeInTheDocument();
    expect(submitContact).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ada@example.com',
        turnstileToken: 'test-token',
      })
    );
  });

  it('pre-selects reason and service from the deep link', () => {
    searchParams.value = new URLSearchParams('reason=services&service=ai-enablement');
    render(<ContactForm services={services} />);
    expect(screen.getByLabelText('reason')).toHaveValue('services');
    expect(screen.getByText('AI enablement')).toBeInTheDocument();
  });

  it('associates picker and turnstile errors with their controls', async () => {
    const user = userEvent.setup();
    render(<ContactForm services={services} />);
    await user.selectOptions(screen.getByLabelText('reason'), 'services');
    await user.click(screen.getByRole('button', { name: /send-message/ }));
    expect(await screen.findByText('select at least one service')).toHaveAttribute(
      'id',
      'contact-services-error'
    );
    expect(screen.getByRole('button', { name: /select services/ })).toHaveAttribute(
      'aria-describedby',
      'contact-services-error'
    );
    expect(screen.getByRole('button', { name: /send-message/ })).toHaveAttribute(
      'aria-describedby',
      'contact-turnstile-error'
    );
  });
});
