/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { commandField } from '@/collections/page-blocks/fields';

import type { Block } from 'payload';

/**
 * A card for each Service, linking to its detail. It shows the shared
 * Services records; there is nothing about a service to type here.
 */
export const ServicesGridBlock: Block = {
  slug: 'servicesGrid',
  fields: [commandField()],
  interfaceName: 'ServicesGridBlock',
  labels: { plural: 'Services grids', singular: 'Services grid' },
};
