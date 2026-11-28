/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import {
  EmailField,
  Form,
  Link,
  PasswordField,
  useAuth,
  useConfig,
  useTranslation,
} from '@payloadcms/ui';
import { email, formatAdminURL } from 'payload/shared';

import { LoginChallenge } from '@/components/admin/login-challenge';
import { LOGIN_CHALLENGE_FIELD, signedInSchema } from '@/lib/validation/login';

import type { FormProps } from '@payloadcms/ui';

export interface LoginFormProps {
  /** Where the admin goes once signed in. Already checked to be on this site. */
  redirectTo: string;
}

/** Payload's own class names, so the form is drawn by the admin's stylesheet. */
const FORM_CLASS = 'login__form';

/**
 * The three fields the sign-in is made of. The token starts empty and is
 * filled in by `LoginChallenge`; naming it here is what puts it in the body
 * Payload's `Form` sends.
 */
const INITIAL_STATE: NonNullable<FormProps['initialState']> = {
  email: { initialValue: undefined, valid: true, value: undefined },
  password: { initialValue: undefined, valid: true, value: undefined },
  [LOGIN_CHALLENGE_FIELD]: { initialValue: '', valid: true, value: '' },
};

/**
 * The admin's sign-in form. It is Payload's own, rebuilt from the same
 * parts, with one addition: the Turnstile widget sits inside the form, so
 * its token is sent with the email and the password. Payload offers no way
 * to put a field into the form it ships, which is why this one replaces it
 * (`admin.components.views.login` in the config).
 */
export const LoginForm = ({ redirectTo }: LoginFormProps) => {
  const {
    config: {
      admin: {
        routes: { forgot: forgotRoute },
        user: userSlug,
      },
      routes: { admin: adminRoute, api: apiRoute },
    },
  } = useConfig();
  const { t } = useTranslation();
  const { setUser } = useAuth();

  // Without this the admin goes on believing nobody is signed in until the
  // page is loaded afresh.
  const onSuccess = (json: unknown): void => {
    const signedIn = signedInSchema.safeParse(json);
    if (signedIn.success) {
      setUser(signedIn.data);
    }
  };

  return (
    <Form
      action={formatAdminURL({ apiRoute, path: `/${userSlug}/login` })}
      className={FORM_CLASS}
      disableSuccessStatus
      initialState={INITIAL_STATE}
      method="POST"
      onSuccess={onSuccess}
      redirect={redirectTo}
      waitForAutocomplete
    >
      <div className={`${FORM_CLASS}__inputWrap`}>
        <EmailField
          field={{
            name: 'email',
            admin: { autoComplete: 'email' },
            label: t('general:email'),
            required: true,
          }}
          path="email"
          validate={email}
        />
        <PasswordField
          field={{ name: 'password', label: t('general:password'), required: true }}
          path="password"
        />
      </div>
      <Link href={formatAdminURL({ adminRoute, path: forgotRoute })} prefetch={false}>
        {t('authentication:forgotPasswordQuestion')}
      </Link>
      <LoginChallenge />
    </Form>
  );
};
