/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { PAGE_BLOCKS } from '@/collections/page-blocks';

describe('PAGE_BLOCKS', () => {
  it('gives every kind of Block a name of its own', () => {
    const slugs = PAGE_BLOCKS.map(({ slug }) => slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('names the type each kind generates, so the renderer can require it', () => {
    expect(PAGE_BLOCKS.filter(({ interfaceName }) => !interfaceName)).toEqual([]);
  });

  /**
   * The cookie inventory and the manage-preferences control arrive with the
   * privacy Page; until then the admin must not offer them.
   */
  it('offers the kinds the owner approved, and no others', () => {
    expect(PAGE_BLOCKS.map(({ slug }) => slug)).toEqual([
      'hero',
      'terminal',
      'chipList',
      'timeline',
      'linkList',
      'definitionList',
      'servicesGrid',
      'servicesDetail',
      'latestPosts',
      'postList',
      'newsletterSignup',
      'contactForm',
      'picture',
      'cvSummary',
      'cvSkills',
      'cvExperience',
      'cvEntries',
      'resumeDownload',
    ]);
  });
});
