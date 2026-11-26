/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { cvTextField } from '@/collections/page-blocks/cv-text';

import type { Block } from 'payload';

/**
 * The CV's work history, typed into this Block. It is deliberately separate
 * from the career Timeline on the home Page: the two may differ.
 */
export const CvExperienceBlock: Block = {
  slug: 'cvExperience',
  fields: [
    { name: 'heading', type: 'text', required: true },
    {
      name: 'entries',
      type: 'array',
      fields: [
        { name: 'role', type: 'text', required: true },
        { name: 'org', type: 'text', label: 'Organisation', required: true },
        { name: 'location', type: 'text' },
        { name: 'start', type: 'text', required: true },
        { name: 'end', type: 'text', required: true },
        {
          name: 'bullets',
          type: 'array',
          fields: [cvTextField('text', { required: true })],
          labels: { plural: 'Points', singular: 'Point' },
        },
      ],
      labels: { plural: 'Roles', singular: 'Role' },
      required: true,
    },
  ],
  interfaceName: 'CvExperienceBlock',
  labels: { plural: 'CV experience', singular: 'CV experience' },
};
