/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { commandField, linkGroup } from '@/collections/page-blocks/fields';

import type { Block } from 'payload';

/**
 * The opening of a Page: the owner's name and tagline from Site settings as
 * the Page's main heading, a line of summary, and up to two links. A Page
 * that starts with a Hero shows no separate Page heading.
 */
export const HeroBlock: Block = {
  slug: 'hero',
  fields: [
    commandField('whoami'),
    {
      name: 'summary',
      type: 'textarea',
      admin: { description: 'One or two lines under the tagline.' },
    },
    linkGroup('primaryAction', 'Main button'),
    linkGroup('secondaryAction', 'Second button'),
  ],
  interfaceName: 'HeroBlock',
  labels: { plural: 'Heroes', singular: 'Hero' },
};
