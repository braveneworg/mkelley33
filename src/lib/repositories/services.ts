import config from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

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
  } catch {
    // DB unreachable (e.g. CI build) — serve the canonical static list.
    return SERVICES;
  }
});
