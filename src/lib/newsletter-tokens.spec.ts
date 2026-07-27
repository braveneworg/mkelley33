/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { generateToken, hashToken } from '@/lib/newsletter-tokens';

describe('newsletter tokens', () => {
  it('generates a 64-hex raw token whose hash matches hashToken', () => {
    const token = generateToken();
    expect(token.raw).toMatch(/^[0-9a-f]{64}$/);
    expect(token.hash).toBe(hashToken(token.raw));
    expect(token.hash).not.toBe(token.raw);
  });

  it('is unique per call and deterministic per input', () => {
    expect(generateToken().raw).not.toBe(generateToken().raw);
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });
});
