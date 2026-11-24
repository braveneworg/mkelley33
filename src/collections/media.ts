/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import path from 'node:path';

import type { CollectionConfig } from 'payload';

/** The Media library: the pictures Blocks and posts show. */
export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  fields: [{ name: 'alt', type: 'text', required: true }],
  upload: {
    // Used whenever no blob storage is configured, as for the Resume's
    // uploads. `UPLOADS_DIR` gives each integration spec a directory of its
    // own; without it this is `media/` in the working directory.
    staticDir: path.resolve(process.env.UPLOADS_DIR ?? '.', 'media'),
  },
};
