/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { cvTextField } from '@/collections/page-blocks/cv-text';

import type { Block } from 'payload';

/** A headed list of the CV: education, open source, writing. */
export const CvEntriesBlock: Block = {
  slug: 'cvEntries',
  fields: [
    { name: 'heading', type: 'text', required: true },
    {
      name: 'items',
      type: 'array',
      fields: [cvTextField('title', { required: true }), cvTextField('detail')],
      labels: { plural: 'Items', singular: 'Item' },
      required: true,
    },
  ],
  interfaceName: 'CvEntriesBlock',
  labels: { plural: 'CV lists', singular: 'CV list' },
};
