/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { cache } from 'react';

import { getPayload } from 'payload';

import config from '@payload-config';

import type { ServiceContent } from '@/lib/services-content';

/**
 * The services in the order the owner arranged them. An empty collection is
 * an empty list; a database failure is not caught. There is no fallback to
 * source (docs/adr/0001): the error fails a build, and during revalidation
 * Next keeps serving the last page it built.
 */
export const listServices = cache(async (): Promise<ServiceContent[]> => {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'services',
    limit: 20,
    overrideAccess: false,
    sort: 'order',
  });
  return result.docs.map((doc) => ({
    credibility: doc.credibility,
    deliverables: doc.deliverables,
    name: doc.name,
    pitch: doc.pitch,
    slug: doc.slug,
  }));
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
