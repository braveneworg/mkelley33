/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { TURNSTILE_TEST_SITE_KEY, turnstileSiteKey } from '@/lib/turnstile/site-key';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('turnstileSiteKey', () => {
  it('prefers the configured site key', () => {
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'real-key');
    expect(turnstileSiteKey()).toBe('real-key');
  });

  it('falls back to the Cloudflare test key when unset', () => {
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', undefined);
    expect(turnstileSiteKey()).toBe(TURNSTILE_TEST_SITE_KEY);
  });

  it('passes an explicitly empty value through rather than replacing it', () => {
    // `??`, not `||` — unchanged from the module this was split out of.
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '');
    expect(turnstileSiteKey()).toBe('');
  });
});
