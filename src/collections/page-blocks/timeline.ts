/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { commandField, linkGroup } from '@/collections/page-blocks/fields';

import type { Block } from 'payload';

/**
 * A dated list, newest first, typed into this Block. The career log on the
 * home Page is one; it is deliberately separate from the CV's own history.
 */
export const TimelineBlock: Block = {
  slug: 'timeline',
  fields: [
    commandField(),
    {
      name: 'entries',
      type: 'array',
      fields: [
        {
          name: 'marker',
          type: 'text',
          admin: { description: 'The short code shown first, like a commit hash.' },
        },
        { name: 'title', type: 'text', required: true },
        { name: 'period', type: 'text', admin: { description: 'For example 2021–present.' } },
      ],
      labels: { plural: 'Entries', singular: 'Entry' },
      required: true,
    },
    linkGroup('link', 'Link under the list'),
  ],
  interfaceName: 'TimelineBlock',
  labels: { plural: 'Timelines', singular: 'Timeline' },
};
