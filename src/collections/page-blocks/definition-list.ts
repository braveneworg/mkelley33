/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { commandField } from '@/collections/page-blocks/fields';

import type { Block } from 'payload';

/** A headed list of things and a note on each — the shape of the uses Page. */
export const DefinitionListBlock: Block = {
  slug: 'definitionList',
  fields: [
    commandField(),
    { name: 'heading', type: 'text' },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'term', type: 'text', required: true },
        { name: 'description', type: 'textarea' },
      ],
      labels: { plural: 'Items', singular: 'Item' },
      required: true,
    },
  ],
  interfaceName: 'DefinitionListBlock',
  labels: { plural: 'Definition lists', singular: 'Definition list' },
};
