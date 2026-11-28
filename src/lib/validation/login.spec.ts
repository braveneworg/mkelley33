/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
  LOGIN_CHALLENGE_FIELD,
  loginChallengeSchema,
  signedInSchema,
} from '@/lib/validation/login';

describe('loginChallengeSchema', () => {
  it('reads the token out of a sign-in body and leaves the credentials behind', () => {
    const body = { email: 'owner@example.test', password: 'hunter2hunter2', turnstileToken: 'tok' };

    expect(loginChallengeSchema.parse(body)).toEqual({ turnstileToken: 'tok' });
  });

  it('names the field the sign-in form sends the token in', () => {
    expect(loginChallengeSchema.safeParse({ [LOGIN_CHALLENGE_FIELD]: 'tok' }).success).toBe(true);
  });

  it('rejects a body with no token', () => {
    expect(loginChallengeSchema.safeParse({ email: 'owner@example.test' }).success).toBe(false);
  });

  it('rejects an empty token', () => {
    expect(loginChallengeSchema.safeParse({ turnstileToken: '' }).success).toBe(false);
  });

  it('rejects a token that is not text', () => {
    expect(loginChallengeSchema.safeParse({ turnstileToken: ['tok'] }).success).toBe(false);
  });

  it('rejects a token longer than Cloudflare issues', () => {
    expect(loginChallengeSchema.safeParse({ turnstileToken: 'x'.repeat(2049) }).success).toBe(
      false
    );
  });

  it('rejects a request with no body at all', () => {
    expect(loginChallengeSchema.safeParse(undefined).success).toBe(false);
  });
});

describe('signedInSchema', () => {
  const reply = {
    exp: 1_795_846_238,
    message: 'Authentication Passed',
    token: 'jwt',
    user: { collection: 'users', email: 'owner@example.test', id: 'abc123' },
  };

  it('accepts what Payload answers a sign-in with', () => {
    expect(signedInSchema.safeParse(reply).success).toBe(true);
  });

  it('keeps the fields of the user it does not itself name', () => {
    expect(signedInSchema.parse(reply).user).toEqual(reply.user);
  });

  it('rejects a reply that names no user', () => {
    expect(signedInSchema.safeParse({ exp: reply.exp, token: reply.token }).success).toBe(false);
  });

  it('rejects a reply that does not say when the session ends', () => {
    expect(signedInSchema.safeParse({ user: reply.user }).success).toBe(false);
  });
});
