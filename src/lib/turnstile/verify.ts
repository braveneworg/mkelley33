/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// The server half of the Turnstile pair — the only module that reads
// TURNSTILE_SECRET_KEY. `server-only` makes that a build error rather than a
// code-review note: importing this from a Client Component fails the build
// instead of leaving tree-shaking as the only thing keeping the secret out of
// the browser bundle. The client half lives in `site-key.ts`.
import 'server-only';

/** Cloudflare's official always-pass test secret — non-production only. */
const TURNSTILE_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Picks the secret to verify against, or `null` when production has none.
 *
 * Absence is what production refuses, never a particular value: an explicitly
 * configured secret is honored everywhere, including the test secret that
 * `scripts/e2e.mjs` pins into a production build. Only the implicit fallback
 * is withheld, because a production site that silently swaps in an always-pass
 * secret has a spam gate that reports success and stops nothing.
 *
 * A blank value counts as absent. `''` is how this repo already spells "not
 * configured" for an env-gated dependency (`SMTP_HOST`,
 * `BLOB_READ_WRITE_TOKEN`), and an empty secret could never verify a token
 * anyway.
 */
const verificationSecret = (): null | string => {
  const configured = process.env.TURNSTILE_SECRET_KEY;
  if (configured !== undefined && configured !== '') {
    return configured;
  }
  if (process.env.NODE_ENV === 'production') {
    console.error('TURNSTILE_SECRET_KEY unset — refusing to verify (submissions will be rejected)');
    return null;
  }
  console.warn('TURNSTILE_SECRET_KEY unset — using Cloudflare test secret (always passes)');
  return TURNSTILE_TEST_SECRET_KEY;
};

/**
 * Asks Cloudflare whether a widget token is genuine.
 *
 * Fails closed on every path that is not an explicit success: no secret in
 * production, a non-200 reply, a body that will not parse, and a request that
 * never completes all return `false`. A boolean is the whole contract because
 * the one caller — `runFormSubmission` — owes the user the same message
 * whichever way verification did not happen.
 */
export const verifyTurnstileToken = async (token: string): Promise<boolean> => {
  // Truthiness rather than `=== null`: `security/detect-possible-timing-attacks`
  // flags any equality test against an identifier named `secret`, and that rule
  // is not one this repo lets a file opt out of (src/AGENTS.md). Nothing is
  // lost — `verificationSecret` returns a usable value or nothing at all.
  const secret = verificationSecret();
  if (!secret) {
    return false;
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
