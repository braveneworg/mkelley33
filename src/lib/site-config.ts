/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * What stays in code about the site. The owner's identity and links are Site
 * settings and live in the database (docs/adr/0001) — read them with
 * `getSiteSettings` from `@/lib/repositories/site-settings`. The domain is
 * here because changing it is a deploy, not an edit.
 */
export interface SiteConfig {
  handle: string;
  /** Path under /public to the headshot image; null until the owner supplies it. */
  headshot: string | null;
  url: string;
}

export const siteConfig: SiteConfig = {
  handle: 'mkelley33',
  headshot: '/headshot.webp',
  url: 'https://mkelley33.com',
};

/**
 * The Resume's permanent address. The file behind it is whatever the owner
 * last uploaded in Site settings; the address itself never changes, so links
 * to it from elsewhere keep working.
 */
export const RESUME_PATH = '/michaux-kelley-resume.pdf';
