/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// The server half of the Turnstile pair — the only module that reads
// TURNSTILE_SECRET_KEY. `server-only` makes that a build error rather than a
// code-review note: importing this from a Client Component fails the build
// instead of leaving tree-shaking as the only thing keeping the secret out of
// the browser bundle. The client half lives in `site-key.ts`.
import 'server-only';

/** Cloudflare's official always-pass test secret — dev/CI fallback only. */
const TURNSTILE_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Fails closed: any verification problem counts as not-verified. */
export const verifyTurnstileToken = async (token: string): Promise<boolean> => {
  const secret = process.env.TURNSTILE_SECRET_KEY ?? TURNSTILE_TEST_SECRET_KEY;
  if (!process.env.TURNSTILE_SECRET_KEY) {
    const message = 'TURNSTILE_SECRET_KEY unset — using Cloudflare test secret (always passes)';
    if (process.env.NODE_ENV === 'production') {
      console.error(message);
    } else {
      console.warn(message);
    }
  }
  try {
    const response = await fetch(VERIFY_URL, {
      body: new URLSearchParams({ response: token, secret }),
      method: 'POST',
    });
    if (!response.ok) {
      console.error('turnstile verify: HTTP', response.status);
      return false;
    }
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error('turnstile verify failed:', error);
    return false;
  }
};
