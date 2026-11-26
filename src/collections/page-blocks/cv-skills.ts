/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { cvTextField } from '@/collections/page-blocks/cv-text';

import type { Block } from 'payload';

/** The CV's skills, grouped under labels. */
export const CvSkillsBlock: Block = {
  slug: 'cvSkills',
  fields: [
    { name: 'heading', type: 'text', required: true },
    {
      name: 'groups',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        cvTextField('items', { required: true }),
      ],
      labels: { plural: 'Groups', singular: 'Group' },
      required: true,
    },
  ],
  interfaceName: 'CvSkillsBlock',
  labels: { plural: 'CV skills', singular: 'CV skills' },
};
