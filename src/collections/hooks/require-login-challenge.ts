/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { APIError } from 'payload';

import { loginChallengeSchema } from '@/lib/validation/login';

import type { CollectionBeforeOperationHook } from 'payload';

/**
 * One message for every sign-in the challenge turns away, whatever the
 * reason: no token, a spent one, one Cloudflare rejects, or Cloudflare not
 * answering. The reason goes to the server log from `verify.ts`.
 */
export const LOGIN_CHALLENGE_FAILED_ERROR =
  'Security check failed. Wait for it to finish, then sign in again.';

const FORBIDDEN = 403;

/**
 * Loaded when a sign-in arrives rather than with this file. The Payload
 * config imports this hook, and the config is also loaded by plain Node —
 * the Seed, Capture, the type and import-map generators, every integration
 * spec — where `verify.ts`'s `server-only` guard throws on import.
 */
const passesChallenge = async (token: string): Promise<boolean> => {
  const { verifyTurnstileToken } = await import('@/lib/turnstile/verify');
  return verifyTurnstileToken(token);
};

/**
 * Refuses a sign-in that has not passed Cloudflare Turnstile.
 *
 * `beforeOperation` because it is the first thing a sign-in runs, ahead of
 * the lookup of the account and the check of its password. A sign-in that
 * skips the challenge is therefore told nothing about either: a wrong
 * password and a right one get the same refusal, so the endpoint cannot be
 * used to try passwords without solving a challenge for each one.
 *
 * It is on the operation, not on a route, so every way of signing in goes
 * through it. The admin's form sends the token in the body's
 * `turnstileToken` field (`LOGIN_CHALLENGE_FIELD`). A GraphQL sign-in has
 * nowhere to put one and is refused; so is one made through the Local API
 * unless the caller hands over a request whose body holds a token.
 *
 * That includes the sign-in Payload makes itself at the end of its
 * create-first-user screen: it runs this same operation with that screen's
 * request, which carries no token. The first account comes from
 * `pnpm seed:first-user`, which writes the record and signs nobody in.
 */
export const requireLoginChallenge: CollectionBeforeOperationHook = async ({
  args,
  operation,
  req,
}) => {
  if (operation !== 'login') {
    return args;
  }
  const parsed = loginChallengeSchema.safeParse(req.data);
  if (!parsed.success || !(await passesChallenge(parsed.data.turnstileToken))) {
    throw new APIError(LOGIN_CHALLENGE_FAILED_ERROR, FORBIDDEN);
  }
  return args;
};
