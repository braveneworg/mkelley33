/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { redirect } from 'next/navigation';

import { PayloadLogo } from '@payloadcms/ui/shared';
import { getSafeRedirect } from 'payload/shared';

import { LoginForm } from '@/components/admin/login-form';

import type { AdminViewServerProps } from 'payload';

/**
 * The admin's sign-in screen, in place of the one Payload ships: the same
 * logo above a form that also carries the Turnstile challenge. Payload draws
 * it in its own sign-in template, because the config registers it under the
 * `login` key.
 *
 * `getSafeRedirect` is what keeps `?redirect=` from leading off the site —
 * the same guard Payload's own screen uses.
 */
export const LoginView = ({ initPageResult, searchParams }: AdminViewServerProps) => {
  const {
    req: {
      payload: {
        config: {
          routes: { admin: adminRoute },
        },
      },
      user,
    },
  } = initPageResult;
  const redirectTo = getSafeRedirect({
    fallbackTo: adminRoute,
    redirectTo: searchParams?.redirect ?? '',
  });
  if (user) {
    redirect(redirectTo);
  }
  return (
    <>
      <div className="login__brand">
        <PayloadLogo />
      </div>
      <LoginForm redirectTo={redirectTo} />
    </>
  );
};
