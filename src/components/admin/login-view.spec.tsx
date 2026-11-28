/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { LoginView } from '@/components/admin/login-view';

import type { AdminViewServerProps } from 'payload';

const redirect = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@payloadcms/ui/shared', () => ({
  PayloadLogo: () => <div data-testid="logo" />,
}));
// Covered by its own spec; here it only reports where it was told to lead.
vi.mock('@/components/admin/login-form', () => ({
  LoginForm: ({ redirectTo }: { redirectTo: string }) => (
    <div data-redirect-to={redirectTo} data-testid="login-form" />
  ),
}));

interface ViewRequest {
  redirectParam?: string;
  user?: { id: string };
}

/** What Payload hands a view, cut down to what this one reads. */
const viewProps = ({ redirectParam, user }: ViewRequest = {}): AdminViewServerProps =>
  ({
    initPageResult: {
      req: { payload: { config: { routes: { admin: '/admin' } } }, user: user ?? null },
    },
    searchParams: redirectParam === undefined ? {} : { redirect: redirectParam },
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginView', () => {
  it('shows the logo above the form', () => {
    render(<LoginView {...viewProps()} />);

    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('leads to the dashboard after a sign-in that was going nowhere in particular', () => {
    render(<LoginView {...viewProps()} />);

    expect(screen.getByTestId('login-form')).toHaveAttribute('data-redirect-to', '/admin');
  });

  it('leads back to the screen that asked for the sign-in', () => {
    render(<LoginView {...viewProps({ redirectParam: '/admin/collections/posts' })} />);

    expect(screen.getByTestId('login-form')).toHaveAttribute(
      'data-redirect-to',
      '/admin/collections/posts'
    );
  });

  it('does not lead off the site', () => {
    render(<LoginView {...viewProps({ redirectParam: 'https://example.test/phish' })} />);

    expect(screen.getByTestId('login-form')).toHaveAttribute('data-redirect-to', '/admin');
  });

  it('sends someone already signed in straight on', () => {
    render(<LoginView {...viewProps({ redirectParam: '/admin/account', user: { id: 'u1' } })} />);

    expect(redirect).toHaveBeenCalledExactlyOnceWith('/admin/account');
  });

  it('keeps someone who is not signed in on the form', () => {
    render(<LoginView {...viewProps()} />);

    expect(redirect).not.toHaveBeenCalled();
  });
});
