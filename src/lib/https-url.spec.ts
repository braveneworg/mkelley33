/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { isHttpsUrl } from '@/lib/https-url';

describe('isHttpsUrl', () => {
  it('accepts a full https address', () => {
    expect(isHttpsUrl('https://github.com/mkelley33')).toBe(true);
  });

  it.each([
    'http://github.com/mkelley33',
    'github.com/mkelley33',
    'javascript:alert(1)',
    'data:text/html,x',
    '//github.com/mkelley33',
    'not a url',
    '',
  ])('rejects %s', (value) => {
    expect(isHttpsUrl(value)).toBe(false);
  });
});
