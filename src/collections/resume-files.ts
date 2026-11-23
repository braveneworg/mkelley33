/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import path from 'node:path';

import { findPublishedSiteSettings } from '@/globals/published-site-settings';

import type { CollectionConfig } from 'payload';

/**
 * The uploads behind the Resume — the downloadable file of the owner's
 * professional history (see `CONTEXT.md`). Site settings point at the one
 * that is current, and `/michaux-kelley-resume.pdf` serves that one.
 *
 * PDF only: the address it is served at promises one.
 */
export const ResumeFiles: CollectionConfig = {
  slug: 'resume-files',
  access: {
    // An upload is not public by being uploaded. Visitors may read exactly
    // one: the Resume the published Site settings point at. One attached to
    // a draft, replaced, or never attached stays with the signed-in owner.
    read: async ({ req }) => {
      if (req.user) {
        return true;
      }
      const published = await findPublishedSiteSettings(req.payload);
      const resume = published?.resume;
      const id = typeof resume === 'object' ? resume?.id : resume;
      return id ? { id: { equals: id } } : false;
    },
  },
  admin: { useAsTitle: 'filename' },
  fields: [],
  labels: { plural: 'Resume files', singular: 'Resume file' },
  upload: {
    mimeTypes: ['application/pdf'],
    // Used whenever no blob storage is configured: the E2E harness, the
    // integration specs, and a `pnpm seed` run without the blob token.
    // `UPLOADS_DIR` gives each integration spec a directory of its own.
    staticDir: path.resolve(process.env.UPLOADS_DIR ?? '.', 'resume-files'),
  },
};
