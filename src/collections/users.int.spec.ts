/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { LOGIN_CHALLENGE_FAILED_ERROR } from '@/collections/hooks/require-login-challenge';
import { verifyTurnstileToken } from '@/lib/turnstile/verify';
import { createTestPayload } from '@/test/payload-harness';

import type { Payload } from 'payload';

// Cloudflare is the one thing outside the process a sign-in reaches. Mocking
// the module also keeps `server-only`, which it imports, from loading here.
vi.mock('@/lib/turnstile/verify', () => ({ verifyTurnstileToken: vi.fn() }));

const verify = vi.mocked(verifyTurnstileToken);

let payload: Payload;
let reset: () => Promise<void>;
let teardown: () => Promise<void>;

const owner = { email: 'owner@example.test', password: 'a-long-test-password' };

beforeAll(async () => {
  ({ payload, reset, teardown } = await createTestPayload());
}, 120_000);

// Every test starts from a database holding the owner and nobody else.
beforeEach(async () => {
  await reset();
  await payload.create({ collection: 'users', data: owner });
  verify.mockReset();
  verify.mockResolvedValue(true);
});

afterAll(async () => {
  await teardown();
});

/**
 * A sign-in as the admin's form makes it: the credentials, and the token in
 * the request's body beside them.
 */
const signIn = (password: string, body?: Record<string, string>) =>
  payload.login({
    collection: 'users',
    data: { email: owner.email, password },
    req: { data: body },
  });

describe('signing in to the admin', () => {
  it('gives a session to the right password with a token Cloudflare accepts', async () => {
    const { token } = await signIn(owner.password, { turnstileToken: 'tok' });

    expect(token).toEqual(expect.any(String));
  });

  it('refuses the right password when the sign-in carries no token', async () => {
    await expect(signIn(owner.password)).rejects.toThrow(LOGIN_CHALLENGE_FAILED_ERROR);
  });

  it('refuses the right password when Cloudflare rejects the token', async () => {
    verify.mockResolvedValue(false);

    await expect(signIn(owner.password, { turnstileToken: 'tok' })).rejects.toThrow(
      LOGIN_CHALLENGE_FAILED_ERROR
    );
  });

  // The same answer whether or not the password was right, so a sign-in that
  // skips the challenge cannot be used to try passwords.
  it('refuses a wrong password the same way when the challenge was not passed', async () => {
    await expect(signIn('not-the-password')).rejects.toThrow(LOGIN_CHALLENGE_FAILED_ERROR);
  });

  it('still refuses a wrong password after the challenge is passed', async () => {
    await expect(signIn('not-the-password', { turnstileToken: 'tok' })).rejects.toThrow(
      /email or password/i
    );
  });
});
