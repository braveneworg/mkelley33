/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import { useEffect, useRef, useState } from 'react';

import { Turnstile } from '@marsidev/react-turnstile';
import { FormSubmit, useField, useTheme, useTranslation } from '@payloadcms/ui';

import { turnstileSiteKey } from '@/lib/turnstile/site-key';
import { LOGIN_CHALLENGE_FIELD } from '@/lib/validation/login';

import type { TurnstileInstance } from '@marsidev/react-turnstile';

/**
 * The Cloudflare Turnstile widget on the admin's sign-in form, and the
 * button it holds back. It must render inside Payload's `Form`: the token
 * lives in a field of that form, so it is sent in the body of the sign-in
 * beside the email and the password, which is where
 * `requireLoginChallenge` reads it.
 *
 * The widget is shown and runs as soon as the screen loads, unlike the one
 * on the site's forms: nobody opens this screen except to sign in, and the
 * button stays shut until the check is done, so the owner should see it
 * working.
 *
 * The button is a convenience. What refuses a sign-in without a token is
 * the server.
 */
export const LoginChallenge = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { formProcessing, setValue, value } = useField<string>({ path: LOGIN_CHALLENGE_FIELD });
  const [failed, setFailed] = useState(false);
  const widget = useRef<null | TurnstileInstance>(null);
  const signInWentOut = useRef(false);

  // A token is good for one check, so whatever a sign-in comes back with,
  // the one it carried is spent. A reset widget runs its challenge again.
  useEffect(() => {
    if (formProcessing) {
      signInWentOut.current = true;
      return;
    }
    if (signInWentOut.current) {
      signInWentOut.current = false;
      widget.current?.reset();
      setValue('');
    }
  }, [formProcessing, setValue]);

  const onSuccess = (token: string): void => {
    setFailed(false);
    setValue(token);
  };

  return (
    <>
      <div className="login-challenge">
        <Turnstile
          onError={() => setFailed(true)}
          onExpire={() => setValue('')}
          onSuccess={onSuccess}
          options={{ size: 'flexible', theme }}
          ref={widget}
          siteKey={turnstileSiteKey()}
        />
        {failed && (
          <p className="login-challenge__error" role="alert">
            The security check could not load. Check the connection, then reload this page.
          </p>
        )}
      </div>
      <FormSubmit disabled={!value} size="large">
        {t('authentication:login')}
      </FormSubmit>
    </>
  );
};
