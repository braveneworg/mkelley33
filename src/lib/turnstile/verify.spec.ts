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
 * the module keeps it private, and `src/lib/e2e/harness-config.ts` pins this
 * same literal into the E2E environment. A copy that drifts breaks the E2E
 * suite, so the duplication is the assertion.
 */
const TEST_SECRET = '1x0000000000000000000000000000000AA';

/**
 * Every test secret Cloudflare publishes — always-pass, always-fail,
 * always-spent. None of them belongs to a widget, so siteverify accepts them
 * without ever attributing the call to the site's widget. Production ran on
 * the first one for 38 days before the dashboard's "siteverify isn't being
 * called" banner gave it away.
 */
const PUBLISHED_TEST_SECRETS = [
  TEST_SECRET,
  '2x0000000000000000000000000000000AA',
  '3x0000000000000000000000000000000AA',
];

const CONFIGURED_SECRET = 'configured-secret';

/** Stubs `fetch` with one canned Cloudflare reply and returns the spy. */
const stubVerifyResponse = (body: string, status: number) => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const stubSuccess = () => stubVerifyResponse(JSON.stringify({ success: true }), 200);

const stubRejection = (codes: string[]) =>
  stubVerifyResponse(JSON.stringify({ 'error-codes': codes, success: false }), 200);

/** Reads back a field of the form body the module POSTed to Cloudflare. */
const sentField = (fetchMock: ReturnType<typeof stubVerifyResponse>, field: string) =>
  new URLSearchParams(String(fetchMock.mock.calls[0][1]?.body)).get(field);

/** Everything `console.error` was handed, flattened, for asserting what was NOT logged. */
const loggedErrorText = (): string =>
  vi
    .mocked(console.error)
    .mock.calls.flat()
    .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
    .join('\n');

beforeEach(() => {
  vi.stubEnv('TURNSTILE_SECRET_KEY', undefined);
  vi.stubEnv('VERCEL_ENV', undefined);
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

  it('logs the error codes cloudflare returns with a rejection', async () => {
    stubRejection(['invalid-input-secret']);
    await verifyTurnstileToken('tok');
    expect(console.error).toHaveBeenCalledWith('turnstile verify rejected:', [
      'invalid-input-secret',
    ]);
  });

  it('logs a rejection even when cloudflare omits the error codes', async () => {
    stubVerifyResponse(JSON.stringify({ success: false }), 200);
    await verifyTurnstileToken('tok');
    expect(console.error).toHaveBeenCalledWith('turnstile verify rejected:', []);
  });

  it('never logs the secret when cloudflare rejects', async () => {
    stubRejection(['invalid-input-secret']);
    await verifyTurnstileToken('tok');
    expect(loggedErrorText()).not.toContain(CONFIGURED_SECRET);
  });

  it('never logs the token when cloudflare rejects', async () => {
    stubRejection(['invalid-input-response']);
    await verifyTurnstileToken('tok-that-must-not-be-logged');
    expect(loggedErrorText()).not.toContain('tok-that-must-not-be-logged');
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
 * runs a production build with no VERCEL_ENV, so "explicitly set" has to beat
 * "NODE_ENV is production" — fail-closed keys off the absence of a value here.
 * Only Vercel's own production target (below) is allowed to know better.
 */
describe('verifyTurnstileToken in a production build', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
  });

  it('honors an explicitly configured secret', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', CONFIGURED_SECRET);
    stubSuccess();
    await expect(verifyTurnstileToken('tok')).resolves.toBe(true);
  });

  it('honors the test secret when it is the one configured (the E2E shape)', async () => {
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

/**
 * VERCEL_ENV === 'production' is the one place a test secret can only be a
 * mistake: nothing hermetic runs there, and a test secret makes siteverify
 * say yes to every token. The preflight cannot catch it — a sensitive value
 * pulls as a redaction marker — so this is the only guard there is.
 */
describe('verifyTurnstileToken on Vercel production', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'production');
  });

  it('honors a real configured secret', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', CONFIGURED_SECRET);
    stubSuccess();
    await expect(verifyTurnstileToken('tok')).resolves.toBe(true);
  });

  it.each(PUBLISHED_TEST_SECRETS)('refuses the published test secret %s', async (testSecret) => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', testSecret);
    stubSuccess();
    await expect(verifyTurnstileToken('tok')).resolves.toBe(false);
  });

  it('never reaches cloudflare with a test secret', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', TEST_SECRET);
    const fetchMock = stubSuccess();
    await verifyTurnstileToken('tok');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('says on the server log why submissions are being rejected', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', TEST_SECRET);
    stubSuccess();
    await verifyTurnstileToken('tok');
    expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/test secret/));
  });

  it('never logs the secret it refused', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', TEST_SECRET);
    stubSuccess();
    await verifyTurnstileToken('tok');
    expect(loggedErrorText()).not.toContain(TEST_SECRET);
  });
});

/** Previews are production builds too, but a test secret there is a legitimate choice. */
describe('verifyTurnstileToken on a Vercel preview', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'preview');
  });

  it('honors the test secret when it is the one configured', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', TEST_SECRET);
    const fetchMock = stubSuccess();
    await expect(verifyTurnstileToken('tok')).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
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
