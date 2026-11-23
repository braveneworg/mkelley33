/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { SiteSetting } from '@/payload-types';

import type { Payload } from 'payload';

const SITE_SETTINGS = 'site-settings';

/**
 * The Site settings visitors are served, or null when none were ever
 * published.
 *
 * Normally that is the record itself. The admin also lets the owner
 * unpublish it, and the site cannot render without settings, so unpublishing
 * does not take them away: the last version that was published stays in
 * force until the owner publishes again. Drafts, and edits saved while
 * unpublished, are never returned.
 *
 * It reads with the owner's access, because version history is not public.
 * What it hands back is published content only, so its callers may show it
 * to anyone. Takes the Payload instance rather than building one, so an
 * access function can call it without importing the config that defines it.
 */
export const findPublishedSiteSettings = async (
  payload: Payload,
  depth = 0
): Promise<null | SiteSetting> => {
  const current = await payload.findGlobal({
    depth,
    draft: false,
    overrideAccess: true,
    slug: SITE_SETTINGS,
  });
  if (current._status === 'published') {
    return current;
  }
  const { docs } = await payload.findGlobalVersions({
    depth,
    limit: 1,
    overrideAccess: true,
    slug: SITE_SETTINGS,
    sort: '-updatedAt',
    where: { 'version._status': { equals: 'published' } },
  });
  return docs[0]?.version ?? null;
};

/**
 * The newest saved state of the Site settings, published or not — what the
 * owner previews. Never serve this to a visitor.
 */
export const findSiteSettingsDraft = (payload: Payload, depth = 0): Promise<SiteSetting> =>
  payload.findGlobal({ depth, draft: true, overrideAccess: true, slug: SITE_SETTINGS });
