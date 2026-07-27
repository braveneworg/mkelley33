/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { TURNSTILE_TEST_SITE_KEY, turnstileSiteKey, verifyTurnstileToken } from '@/lib/turnstile';

describe('verifyTurnstileToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when cloudflare reports success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))
    );
    await expect(verifyTurnstileToken('tok')).resolves.toBe(true);
  });

  it('fails closed on failure, non-200, and network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 200 }))
    );
    await expect(verifyTurnstileToken('tok')).resolves.toBe(false);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 500 })));
    await expect(verifyTurnstileToken('tok')).resolves.toBe(false);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(verifyTurnstileToken('tok')).resolves.toBe(false);
  });

  it('uses the configured secret without warning when one is set', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'real-secret');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(verifyTurnstileToken('tok')).resolves.toBe(true);

    expect(String(fetchMock.mock.calls[0][1].body)).toContain('real-secret');
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('escalates the missing-secret notice to console.error in production', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    vi.stubEnv('NODE_ENV', 'production');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))
    );

    await verifyTurnstileToken('tok');

    expect(error).toHaveBeenCalledWith(expect.stringContaining('TURNSTILE_SECRET_KEY unset'));
    expect(warn).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});

describe('turnstileSiteKey', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers the configured site key', async () => {
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'real-key');
    expect(turnstileSiteKey()).toBe('real-key');
  });

  it('falls back to Cloudflare test key when unset', async () => {
    // `??`, not `||` — an explicitly empty value is passed through as-is.
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', undefined);
    expect(turnstileSiteKey()).toBe(TURNSTILE_TEST_SITE_KEY);
  });
});
