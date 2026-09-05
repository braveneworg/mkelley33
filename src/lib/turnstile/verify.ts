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

/**
 * Every test secret Cloudflare publishes: always-pass, always-fail,
 * always-spent. None belongs to a widget, so siteverify answers them without
 * ever attributing the call to the site's widget — which is how production ran
 * on the first one for 38 days with the spam gate accepting everything, until
 * the Turnstile dashboard's "siteverify isn't being called" banner gave it
 * away. A `Set` rather than `===` so `security/detect-possible-timing-attacks`
 * has no equality test on a secret-named operand to flag.
 */
const TURNSTILE_TEST_SECRET_KEYS: ReadonlySet<string> = new Set([
  TURNSTILE_TEST_SECRET_KEY,
  '2x0000000000000000000000000000000AA',
  '3x0000000000000000000000000000000AA',
]);

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * `VERCEL_ENV`, not `NODE_ENV`: the E2E harness runs a `NODE_ENV=production`
 * build with the test secret pinned in, and previews are production builds
 * where a test secret is a legitimate choice. Only Vercel's production target
 * is a place where a test secret can be nothing but a mistake.
 */
const isVercelProduction = (): boolean => process.env.VERCEL_ENV === 'production';

/**
 * Picks the secret to verify against, or `null` when production has none.
 *
 * Absence is what production refuses, plus one value class: an explicitly
 * configured secret is honored everywhere — including the test secret that
 * `src/lib/e2e/harness-config.ts` pins into a production build — except that
 * Vercel's production target refuses Cloudflare's published test secrets.
 * A test secret there makes siteverify say yes to every token, and the deploy
 * preflight cannot see it because a sensitive value pulls as a redaction
 * marker. Refusing is loud (every submission fails, the log says why);
 * honoring it was silent for 38 days.
 *
 * A blank value counts as absent. `''` is how this repo already spells "not
 * configured" for an env-gated dependency (`SMTP_HOST`,
 * `BLOB_READ_WRITE_TOKEN`), and an empty secret could never verify a token
 * anyway.
 */
const verificationSecret = (): null | string => {
  const configured = process.env.TURNSTILE_SECRET_KEY;
  if (configured !== undefined && configured !== '') {
    if (isVercelProduction() && TURNSTILE_TEST_SECRET_KEYS.has(configured)) {
      console.error(
        'TURNSTILE_SECRET_KEY is a Cloudflare test secret — refusing to verify on Vercel production (submissions will be rejected)'
      );
      return null;
    }
    return configured;
  }
  if (process.env.NODE_ENV === 'production') {
    console.error('TURNSTILE_SECRET_KEY unset — refusing to verify (submissions will be rejected)');
    return null;
  }
  console.warn('TURNSTILE_SECRET_KEY unset — using Cloudflare test secret (always passes)');
  return TURNSTILE_TEST_SECRET_KEY;
};

/** The subset of Cloudflare's siteverify reply this module acts on. */
interface SiteverifyReply {
  'error-codes'?: string[];
  success?: boolean;
}

/**
 * Asks Cloudflare whether a widget token is genuine.
 *
 * Fails closed on every path that is not an explicit success: no usable
 * secret, a non-200 reply, a body that will not parse, and a request that
 * never completes all return `false`. A boolean is the whole contract because
 * the one caller — `runFormSubmission` — owes the user the same message
 * whichever way verification did not happen. The reason goes to the server
 * log instead: a rejection carries Cloudflare's `error-codes`, which is how a
 * wrong-but-real secret (`invalid-input-secret`) stops being indistinguishable
 * from a bot. Never the token, never the secret.
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
    const data = (await response.json()) as SiteverifyReply;
    if (data.success !== true) {
      console.error('turnstile verify rejected:', data['error-codes'] ?? []);
      return false;
    }
    return true;
  } catch (error) {
    console.error('turnstile verify failed:', error);
    return false;
  }
};
