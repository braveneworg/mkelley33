/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { SERVICES } from '@/lib/services-content';

import type { Payload } from 'payload';

/** Idempotent upsert of the canonical services list, keyed by slug. */
export const seedServices = async (
  payload: Payload
): Promise<{ created: string[]; updated: string[] }> => {
  const created: string[] = [];
  const updated: string[] = [];
  for (const [index, service] of SERVICES.entries()) {
    const data = {
      credibility: service.credibility,
      deliverables: service.deliverables,
      name: service.name,
      order: index,
      pitch: service.pitch,
      slug: service.slug,
    };
    const existing = await payload.find({
      collection: 'services',
      limit: 1,
      where: { slug: { equals: service.slug } },
    });
    const doc = existing.docs[0];
    if (doc) {
      await payload.update({ collection: 'services', data, id: doc.id });
      updated.push(service.slug);
    } else {
      await payload.create({ collection: 'services', data });
      created.push(service.slug);
    }
  }
  return { created, updated };
};
