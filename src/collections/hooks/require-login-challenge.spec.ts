/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import {
  LOGIN_CHALLENGE_FAILED_ERROR,
  requireLoginChallenge,
} from '@/collections/hooks/require-login-challenge';
import { verifyTurnstileToken } from '@/lib/turnstile/verify';

// The hook's one outside dependency. Mocking it also keeps `server-only`,
// which the real module imports, from loading outside a server bundle.
vi.mock('@/lib/turnstile/verify', () => ({ verifyTurnstileToken: vi.fn() }));

const verify = vi.mocked(verifyTurnstileToken);

const credentials = { email: 'owner@example.test', password: 'a-long-test-password' };

/** What Payload hands a `beforeOperation` hook, cut down to what this one reads. */
const hookArgs = (operation: string, body?: unknown) => {
  const args = { data: credentials };
  return { args, input: { args, operation, req: { data: body } } as never };
};

// `async` so a refusal is always a rejected promise, whatever the hook's type allows.
const runHook = async (operation: string, body?: unknown) =>
  requireLoginChallenge(hookArgs(operation, body).input);

beforeEach(() => {
  verify.mockReset();
  verify.mockResolvedValue(true);
});

describe('requireLoginChallenge', () => {
  it('lets a sign-in through once Cloudflare accepts its token', async () => {
    const { args, input } = hookArgs('login', { ...credentials, turnstileToken: 'tok' });

    await expect(requireLoginChallenge(input)).resolves.toBe(args);
  });

  it('asks Cloudflare about the token the sign-in carried', async () => {
    await runHook('login', { ...credentials, turnstileToken: 'tok' });

    expect(verify).toHaveBeenCalledExactlyOnceWith('tok');
  });

  it('refuses a sign-in whose token Cloudflare rejects', async () => {
    verify.mockResolvedValue(false);

    await expect(runHook('login', { ...credentials, turnstileToken: 'tok' })).rejects.toThrow(
      LOGIN_CHALLENGE_FAILED_ERROR
    );
  });

  it('refuses a sign-in that carries no token', async () => {
    await expect(runHook('login', credentials)).rejects.toThrow(LOGIN_CHALLENGE_FAILED_ERROR);
  });

  it('refuses a sign-in that carries an empty token', async () => {
    await expect(runHook('login', { ...credentials, turnstileToken: '' })).rejects.toThrow(
      LOGIN_CHALLENGE_FAILED_ERROR
    );
  });

  it('refuses a sign-in that arrives with no body, as one over GraphQL does', async () => {
    await expect(runHook('login')).rejects.toThrow(LOGIN_CHALLENGE_FAILED_ERROR);
  });

  it('does not ask Cloudflare about a sign-in with no token to check', async () => {
    await runHook('login', credentials).catch(() => undefined);

    expect(verify).not.toHaveBeenCalled();
  });

  it('answers a refused sign-in with 403', async () => {
    await expect(runHook('login', credentials)).rejects.toMatchObject({ status: 403 });
  });

  it('leaves every other operation alone', async () => {
    const { args, input } = hookArgs('forgotPassword', { email: credentials.email });

    await expect(requireLoginChallenge(input)).resolves.toBe(args);
  });

  it('does not ask Cloudflare about an operation that is not a sign-in', async () => {
    await runHook('read');

    expect(verify).not.toHaveBeenCalled();
  });
});
