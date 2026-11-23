/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { commandField, linkGroup, validateLinkUrl } from '@/collections/page-blocks/fields';

const validate = (value: null | string | undefined, siblingData: object): string | true =>
  validateLinkUrl(value, { siblingData } as never) as string | true;

describe('validateLinkUrl', () => {
  it('accepts a full https address', () => {
    expect(validate('https://example.com/a', {})).toBe(true);
  });

  it('accepts an empty address, for a link that points at a Page', () => {
    expect(validate('', { page: 'page-1' })).toBe(true);
  });

  it('refuses an address that is not https', () => {
    expect(validate('http://example.com', {})).toEqual(expect.any(String));
  });

  it('refuses a site-relative address, which a Page link is for', () => {
    expect(validate('/uses', {})).toEqual(expect.any(String));
  });

  it('refuses a Page and an address together', () => {
    expect(validate('https://example.com', { page: 'page-1' })).toBe(
      'Choose a Page or type an address, not both.'
    );
  });
});

describe('commandField', () => {
  it('starts a new Block with the default it was given', () => {
    expect(commandField('whoami').defaultValue).toBe('whoami');
  });

  it('starts a new Block without a command line when given none', () => {
    expect(commandField().defaultValue).toBeUndefined();
  });
});

describe('linkGroup', () => {
  it('offers a label, a Page and an outside address', () => {
    const names = linkGroup('link', 'Link').fields.map((field) =>
      'name' in field ? field.name : ''
    );

    expect(names).toEqual(['label', 'page', 'url']);
  });
});
