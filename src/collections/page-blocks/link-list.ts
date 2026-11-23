/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { commandField } from '@/collections/page-blocks/fields';
import { validateHttpsUrl } from '@/globals/validate-https-url';

import type { Block } from 'payload';

/** Named items with a line of description each; an item may link elsewhere. */
export const LinkListBlock: Block = {
  slug: 'linkList',
  fields: [
    commandField(),
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        {
          name: 'url',
          type: 'text',
          admin: { description: 'A full https:// address. Leave empty for an item with no link.' },
          label: 'Address',
          validate: validateHttpsUrl,
        },
        { name: 'description', type: 'textarea' },
      ],
      labels: { plural: 'Items', singular: 'Item' },
      required: true,
    },
  ],
  interfaceName: 'LinkListBlock',
  labels: { plural: 'Link lists', singular: 'Link list' },
};
