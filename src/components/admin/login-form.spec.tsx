/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';

import { LoginForm } from '@/components/admin/login-form';

const setUser = vi.hoisted(() => vi.fn());
/** The props the form handed Payload's `Form`, for the tests to read back. */
const formProps = vi.hoisted(() => ({
  current: undefined as
    undefined | { initialState: Record<string, unknown>; onSuccess: (json: unknown) => void },
}));

interface MockFormProps {
  action: string;
  children: ReactNode;
  initialState: Record<string, unknown>;
  method: string;
  onSuccess: (json: unknown) => void;
  redirect: string;
}

interface MockFieldProps {
  field: { label: string; required?: boolean };
  path: string;
}

vi.mock('@payloadcms/ui', () => {
  const MockField = ({ field: { label, required }, path }: MockFieldProps) => (
    <label>
      {label}
      <input name={path} required={required} />
    </label>
  );
  return {
    EmailField: MockField,
    Form: ({ action, children, initialState, method, onSuccess, redirect }: MockFormProps) => {
      formProps.current = { initialState, onSuccess };
      return (
        <form action={action} data-redirect={redirect} data-testid="sign-in" method={method}>
          {children}
        </form>
      );
    },
    Link: ({ children, href }: { children: ReactNode; href: string }) => (
      <a href={href}>{children}</a>
    ),
    PasswordField: MockField,
    useAuth: () => ({ setUser }),
    useConfig: () => ({
      config: {
        admin: { routes: { forgot: '/forgot' }, user: 'users' },
        routes: { admin: '/admin', api: '/api' },
      },
    }),
    useTranslation: () => ({ t: (key: string) => key }),
  };
});
// Covered by its own spec; here it only has to be inside the form.
vi.mock('@/components/admin/login-challenge', () => ({
  LoginChallenge: () => <div data-testid="login-challenge" />,
}));

const signedIn = {
  exp: 1_795_846_238,
  token: 'jwt',
  user: { collection: 'users', email: 'owner@example.test', id: 'abc123' },
};

beforeEach(() => {
  vi.clearAllMocks();
  formProps.current = undefined;
});

describe('LoginForm', () => {
  it('sends the sign-in to the Users collection', () => {
    render(<LoginForm redirectTo="/admin" />);

    expect(screen.getByTestId('sign-in')).toHaveAttribute('action', '/api/users/login');
  });

  it('posts it', () => {
    render(<LoginForm redirectTo="/admin" />);

    expect(screen.getByTestId('sign-in')).toHaveAttribute('method', 'POST');
  });

  it('takes the owner where they were going once signed in', () => {
    render(<LoginForm redirectTo="/admin/collections/posts" />);

    expect(screen.getByTestId('sign-in')).toHaveAttribute(
      'data-redirect',
      '/admin/collections/posts'
    );
  });

  it('asks for the email', () => {
    render(<LoginForm redirectTo="/admin" />);

    expect(screen.getByLabelText('general:email')).toBeRequired();
  });

  it('asks for the password', () => {
    render(<LoginForm redirectTo="/admin" />);

    expect(screen.getByLabelText('general:password')).toBeRequired();
  });

  it('puts the security check inside the form, so its token travels with the sign-in', () => {
    render(<LoginForm redirectTo="/admin" />);

    expect(screen.getByTestId('sign-in')).toContainElement(screen.getByTestId('login-challenge'));
  });

  it('starts the form with an empty token field', () => {
    render(<LoginForm redirectTo="/admin" />);

    expect(formProps.current?.initialState).toHaveProperty('turnstileToken.value', '');
  });

  it('links to the forgotten-password screen', () => {
    render(<LoginForm redirectTo="/admin" />);

    expect(
      screen.getByRole('link', { name: 'authentication:forgotPasswordQuestion' })
    ).toHaveAttribute('href', '/admin/forgot');
  });

  it('tells the admin who signed in', () => {
    render(<LoginForm redirectTo="/admin" />);

    formProps.current?.onSuccess(signedIn);

    expect(setUser).toHaveBeenCalledExactlyOnceWith(signedIn);
  });

  it('does not take a reply that names no user for a sign-in', () => {
    render(<LoginForm redirectTo="/admin" />);

    formProps.current?.onSuccess({ message: 'ok' });

    expect(setUser).not.toHaveBeenCalled();
  });
});
