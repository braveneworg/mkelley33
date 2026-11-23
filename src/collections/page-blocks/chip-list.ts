/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { commandField } from '@/collections/page-blocks/fields';

import type { Block } from 'payload';

/** A sentence and a cloud of short labels. */
export const ChipListBlock: Block = {
  slug: 'chipList',
  fields: [
    commandField(),
    { name: 'intro', type: 'textarea' },
    { name: 'chips', type: 'text', hasMany: true, required: true },
  ],
  interfaceName: 'ChipListBlock',
  labels: { plural: 'Chip lists', singular: 'Chip list' },
};
