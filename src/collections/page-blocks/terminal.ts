/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { commandField } from '@/collections/page-blocks/fields';

import type { Block } from 'payload';

/** Free text under a command line, with an optional picture beside it. */
export const TerminalBlock: Block = {
  slug: 'terminal',
  fields: [
    commandField(),
    { name: 'body', type: 'richText', required: true },
    { name: 'picture', type: 'upload', relationTo: 'media' },
    {
      name: 'pictureStyle',
      type: 'select',
      defaultValue: 'plain',
      options: [
        { label: 'As uploaded', value: 'plain' },
        { label: 'Round portrait', value: 'roundPortrait' },
      ],
      required: true,
    },
  ],
  interfaceName: 'TerminalBlock',
  labels: { plural: 'Terminals', singular: 'Terminal' },
};
