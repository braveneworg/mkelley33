/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { SiteSettingsContent } from '@/lib/site-settings-content';

/** Published Site settings with every link set, each to a distinct address. */
export const makeSiteSettings = (
  overrides: Partial<SiteSettingsContent> = {}
): SiteSettingsContent => ({
  description: 'a site description',
  name: 'Owner Name',
  repoUrl: 'https://example.com/repo',
  resumeUrl: '/api/resume-files/file/resume.pdf',
  socials: {
    bluesky: 'https://example.com/bluesky',
    github: 'https://example.com/github',
    linkedin: 'https://example.com/linkedin',
  },
  tagline: 'a site tagline',
  title: 'a browser title',
  ...overrides,
});
