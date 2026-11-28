/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { z } from 'zod';

/**
 * The field of a sign-in's body that carries the Turnstile token. One name
 * for both ends: the admin's sign-in form writes it and the Users collection
 * reads it, so the two cannot drift apart.
 */
export const LOGIN_CHALLENGE_FIELD = 'turnstileToken';

/** Cloudflare documents 2048 characters as the longest token it issues. */
const TURNSTILE_TOKEN_MAX_LENGTH = 2048;

/**
 * What the challenge needs from a sign-in's body, and nothing else: the
 * email and the password are Payload's to read, so they are dropped here
 * rather than validated twice.
 */
export const loginChallengeSchema = z.object({
  [LOGIN_CHALLENGE_FIELD]: z.string().min(1).max(TURNSTILE_TOKEN_MAX_LENGTH),
});

export type LoginChallengeValues = z.infer<typeof loginChallengeSchema>;

/**
 * What Payload answers a sign-in with, as far as the admin needs it to know
 * who is now signed in and for how long. The user is kept whole: its other
 * fields are the Users collection's, and Payload's to read.
 */
export const signedInSchema = z.object({
  exp: z.number(),
  token: z.string().optional(),
  user: z.looseObject({
    collection: z.string(),
    id: z.union([z.string(), z.number()]),
  }),
});

export type SignedIn = z.infer<typeof signedInSchema>;
