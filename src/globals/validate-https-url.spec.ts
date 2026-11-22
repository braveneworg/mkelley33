/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { validateHttpsUrl, validateRequiredHttpsUrl } from '@/globals/validate-https-url';

describe('validateHttpsUrl', () => {
  it('accepts an https address', () => {
    expect(validateHttpsUrl('https://github.com/mkelley33')).toBe(true);
  });

  /** Whether a link may be empty is the field's `required`, not this check. */
  it.each([undefined, null, ''])('leaves an empty value (%s) to the required rule', (value) => {
    expect(validateHttpsUrl(value)).toBe(true);
  });

  it.each([
    'http://github.com/mkelley33',
    'github.com/mkelley33',
    'javascript:alert(1)',
    'not a url',
  ])('rejects %s', (value) => {
    expect(validateHttpsUrl(value)).toBe('Enter a full address starting with https://');
  });
});

/**
 * Payload only applies a field's `required` through its default validator,
 * and a field with a validator of its own has none. A required link has to
 * refuse an empty value itself.
 */
describe('validateRequiredHttpsUrl', () => {
  it('accepts an https address', () => {
    expect(validateRequiredHttpsUrl('https://github.com/mkelley33')).toBe(true);
  });

  it.each([undefined, null, '', '   '])('refuses an empty value (%s)', (value) => {
    expect(validateRequiredHttpsUrl(value)).toBe('This link is required.');
  });

  it('refuses an address that is not https', () => {
    expect(validateRequiredHttpsUrl('http://github.com/mkelley33')).toBe(
      'Enter a full address starting with https://'
    );
  });
});
