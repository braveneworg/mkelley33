/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { listSocialLinks } from '@/lib/site-settings-content';

const socials = {
  bluesky: 'https://example.com/bluesky',
  github: 'https://example.com/github',
  linkedin: 'https://example.com/linkedin',
};

describe('listSocialLinks', () => {
  it('lists the profiles in the order the site shows them', () => {
    expect(listSocialLinks(socials)).toEqual([
      { label: 'github', url: 'https://example.com/github' },
      { label: 'linkedin', url: 'https://example.com/linkedin' },
      { label: 'bluesky', url: 'https://example.com/bluesky' },
    ]);
  });

  /** A null link is one the owner cleared; it is hidden everywhere at once. */
  it('leaves out a profile the owner cleared', () => {
    expect(listSocialLinks({ ...socials, bluesky: null }).map(({ label }) => label)).toEqual([
      'github',
      'linkedin',
    ]);
  });
});
