/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { cache } from 'react';

import { getPayload } from 'payload';

import config from '@payload-config';

import { findPublishedSiteSettings } from '@/globals/published-site-settings';
import type { SiteSettingsContent } from '@/lib/site-settings-content';

/** The CMS stores an optional link the owner left empty as '' or not at all. */
const linkOrNull = (value: null | string | undefined): null | string =>
  value === undefined || value === null || value === '' ? null : value;

/**
 * The Site settings visitors are served. Drafts never reach a rendered page,
 * and unpublishing does not remove the settings from the site — see
 * `findPublishedSiteSettings`.
 *
 * Nothing here falls back to source (docs/adr/0001). Settings that were never
 * published throw, and so does a database failure: at build time that fails
 * the build and leaves the current site up, and during revalidation Next
 * keeps serving the last page it built.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettingsContent> => {
  const payload = await getPayload({ config });
  // Deep enough to resolve the Resume upload into its file's address.
  const settings = await findPublishedSiteSettings(payload, 1);
  if (settings === null) {
    throw new Error(
      'Site settings are not published. An empty database is filled with `pnpm seed`; ' +
        'otherwise publish them in the admin.'
    );
  }
  const { description, name, repoUrl, resume, socials, tagline, title } = settings;
  return {
    description,
    name,
    repoUrl: linkOrNull(repoUrl),
    // An id rather than a document means the upload could not be resolved.
    resumeUrl: typeof resume === 'object' ? linkOrNull(resume?.url) : null,
    socials: {
      bluesky: linkOrNull(socials.bluesky),
      github: socials.github,
      linkedin: socials.linkedin,
    },
    tagline,
    title,
  };
});
