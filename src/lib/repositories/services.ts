/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { cache } from 'react';

import { getPayload } from 'payload';

import config from '@payload-config';

import type { ServiceContent } from '@/lib/services-content';
import { SERVICES } from '@/lib/services-content';

export const listServices = cache(async (): Promise<ServiceContent[]> => {
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: 'services',
      limit: 20,
      overrideAccess: false,
      sort: 'order',
    });
    if (result.docs.length === 0) {
      return SERVICES;
    }
    return result.docs.map((doc) => ({
      credibility: doc.credibility,
      deliverables: doc.deliverables,
      name: doc.name,
      pitch: doc.pitch,
      slug: doc.slug,
    }));
  } catch (error) {
    // DB unreachable (e.g. CI build) — serve the canonical static list.
    console.error('listServices falling back to static content:', error);
    return SERVICES;
  }
});

export const findServiceIdsBySlugs = async (slugs: string[]): Promise<string[]> => {
  if (slugs.length === 0) {
    return [];
  }
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: 'services',
      limit: slugs.length,
      overrideAccess: false,
      where: { slug: { in: slugs } },
    });
    return result.docs.map((doc) => String(doc.id));
  } catch (error) {
    console.error('findServiceIdsBySlugs failed:', error);
    return [];
  }
};
