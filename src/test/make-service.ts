/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { ServiceContent } from '@/lib/services-content';

let counter = 0;

/** A service with distinct, recognisable text in every field. */
export const makeService = (overrides: Partial<ServiceContent> = {}): ServiceContent => {
  counter += 1;
  return {
    credibility: `credibility ${counter}`,
    deliverables: [`deliverable ${counter}a`, `deliverable ${counter}b`],
    name: `Service ${counter}`,
    pitch: `pitch ${counter}`,
    slug: `service-${counter}`,
    ...overrides,
  };
};
