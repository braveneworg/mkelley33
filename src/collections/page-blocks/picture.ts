/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { Block } from 'payload';

/** One picture from the Media library, with an optional caption. */
export const PictureBlock: Block = {
  slug: 'picture',
  fields: [
    { name: 'media', type: 'upload', label: 'Picture', relationTo: 'media', required: true },
    { name: 'caption', type: 'text' },
  ],
  interfaceName: 'PictureBlock',
  labels: { plural: 'Pictures', singular: 'Picture' },
};
