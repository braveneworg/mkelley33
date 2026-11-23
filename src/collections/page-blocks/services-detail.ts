/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { commandField } from '@/collections/page-blocks/fields';

import type { Block } from 'payload';

/** Every Service in full, each with its request-a-quote link. */
export const ServicesDetailBlock: Block = {
  slug: 'servicesDetail',
  fields: [commandField()],
  interfaceName: 'ServicesDetailBlock',
  labels: { plural: 'Services details', singular: 'Services detail' },
};
