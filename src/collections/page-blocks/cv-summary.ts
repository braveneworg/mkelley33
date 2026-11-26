/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { cvTextField } from '@/collections/page-blocks/cv-text';

import type { Block } from 'payload';

/** A headed paragraph of the CV. */
export const CvSummaryBlock: Block = {
  slug: 'cvSummary',
  fields: [
    { name: 'heading', type: 'text', required: true },
    cvTextField('text', { required: true }),
  ],
  interfaceName: 'CvSummaryBlock',
  labels: { plural: 'CV summaries', singular: 'CV summary' },
};
