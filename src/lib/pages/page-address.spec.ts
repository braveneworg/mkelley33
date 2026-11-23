/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import {
  FIXED_PAGE_SLUGS,
  HOME_SLUG,
  isFixedPage,
  pageHref,
  RESERVED_PAGE_SLUGS,
  validatePageSlug,
} from '@/lib/pages/page-address';

describe('pageHref', () => {
  it('serves the home Page at the root', () => {
    expect(pageHref(HOME_SLUG)).toBe('/');
  });

  it('serves every other Page one level deep', () => {
    expect(pageHref('uses')).toBe('/uses');
  });
});

describe('isFixedPage', () => {
  it.each(['home', 'blog', 'contact', 'services'])('counts %s as a Fixed Page', (slug) => {
    expect(isFixedPage(slug)).toBe(true);
  });

  it('does not count a Page the owner may move or delete', () => {
    expect(isFixedPage('uses')).toBe(false);
  });
});

describe('validatePageSlug', () => {
  it.each(['uses', 'cv', 'now-2026', 'home'])('accepts %s', (slug) => {
    expect(validatePageSlug(slug)).toBe(true);
  });

  it.each([
    ['an empty address', ''],
    ['a missing address', undefined],
    ['a nested address', 'blog/first'],
    ['capital letters', 'Uses'],
    ['a dot', 'feed.xml'],
    ['a space', 'my page'],
    ['a leading hyphen', '-uses'],
  ])('refuses %s', (_label, slug) => {
    expect(validatePageSlug(slug)).toEqual(expect.any(String));
  });

  it.each([...RESERVED_PAGE_SLUGS])('refuses %s, which the code already serves', (slug) => {
    expect(validatePageSlug(slug)).toContain('already used by the site');
  });

  it('never reserves a Fixed Page, which has to be created', () => {
    expect(FIXED_PAGE_SLUGS.filter((slug) => RESERVED_PAGE_SLUGS.has(slug))).toEqual([]);
  });
});
