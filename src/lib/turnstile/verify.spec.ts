/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { verifyTurnstileToken } from '@/lib/turnstile/verify';

// The real module throws when it is loaded outside a server bundle, which is
// exactly the guard this file exists to keep — see src/AGENTS.md.
vi.mock('server-only', () => ({}));

/**
 * Cloudflare's always-pass test secret, spelled out here rather than imported:
 * the module keeps it private, and `scripts/e2e.mjs` pins this same literal
 * into the E2E environment. A copy that drifts breaks the E2E suite, so the
 * duplication is the assertion.
 */
const TEST_SECRET = '1x0000000000000000000000000000000AA';

const CONFIGURED_SECRET = 'configured-secret';

/** Stubs `fetch` with one canned Cloudflare reply and returns the spy. */
const stubVerifyResponse = (body: string, status: number) => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const stubSuccess = () => stubVerifyResponse(JSON.stringify({ success: true }), 200);

/** Reads back a field of the form body the module POSTed to Cloudflare. */
const sentField = (fetchMock: ReturnType<typeof stubVerifyResponse>, field: string) =>
  new URLSearchParams(String(fetchMock.mock.calls[0][1]?.body)).get(field);

beforeEach(() => {
  vi.stubEnv('TURNSTILE_SECRET_KEY', undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('verifyTurnstileToken with a configured secret', () => {
  beforeEach(() => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', CONFIGURED_SECRET);
  });

  it('verifies when cloudflare reports success', async () => {
    stubSuccess();
    await expect(verifyTurnstileToken('tok')).resolves.toBe(true);
  });

  it('sends the configured secret rather than the test one', async () => {
    const fetchMock = stubSuccess();
    await verifyTurnstileToken('tok');
    expect(sentField(fetchMock, 'secret')).toBe(CONFIGURED_SECRET);
  });

  it('sends the token cloudflare is asked to check', async () => {
    const fetchMock = stubSuccess();
    await verifyTurnstileToken('tok');
    expect(sentField(fetchMock, 'response')).toBe('tok');
  });

  it('rejects when cloudflare reports failure', async () => {
    stubVerifyResponse(JSON.stringify({ success: false }), 200);
    await expect(verifyTurnstileToken('tok')).resolves.toBe(false);
  });

  it('fails closed on a non-200 reply', async () => {
    stubVerifyResponse('upstream is unwell', 500);
    await expect(verifyTurnstileToken('tok')).resolves.toBe(false);
  });

  it('fails closed on a reply that is not JSON', async () => {
    stubVerifyResponse('<html>nope</html>', 200);
    await expect(verifyTurnstileToken('tok')).resolves.toBe(false);
  });

  it('fails closed when the request never completes', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')));
    await expect(verifyTurnstileToken('tok')).resolves.toBe(false);
  });
});

/**
 * The E2E harness pins TURNSTILE_SECRET_KEY to Cloudflare's test secret and
 * runs a production build, so "explicitly set" has to beat "is production" —
 * fail-closed keys off the absence of a value, never off the value itself.
 */
describe('verifyTurnstileToken in production', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
  });

  it('honors an explicitly configured secret', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', CONFIGURED_SECRET);
    stubSuccess();
    await expect(verifyTurnstileToken('tok')).resolves.toBe(true);
  });

  it('honors the test secret when it is the one configured', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', TEST_SECRET);
    stubSuccess();
    await expect(verifyTurnstileToken('tok')).resolves.toBe(true);
  });

  it('fails closed when no secret is configured', async () => {
    stubSuccess();
    await expect(verifyTurnstileToken('tok')).resolves.toBe(false);
  });

  it('treats a blank secret as no secret at all', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    stubSuccess();
    await expect(verifyTurnstileToken('tok')).resolves.toBe(false);
  });

  it('never reaches cloudflare with no secret to verify against', async () => {
    const fetchMock = stubSuccess();
    await verifyTurnstileToken('tok');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('verifyTurnstileToken outside production', () => {
  it('falls back to the test secret when none is configured', async () => {
    const fetchMock = stubSuccess();
    await expect(verifyTurnstileToken('tok')).resolves.toBe(true);
    expect(sentField(fetchMock, 'secret')).toBe(TEST_SECRET);
  });

  it('treats a blank secret as unset and falls back too', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    const fetchMock = stubSuccess();
    await verifyTurnstileToken('tok');
    expect(sentField(fetchMock, 'secret')).toBe(TEST_SECRET);
  });

  it('still fails closed when the fallback call fails', async () => {
    stubVerifyResponse('upstream is unwell', 500);
    await expect(verifyTurnstileToken('tok')).resolves.toBe(false);
  });
});
