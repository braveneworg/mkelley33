/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { ValidationError } from 'payload';

import { isFixedPage } from '@/lib/pages/page-address';

import type { CollectionBeforeChangeHook } from 'payload';

/**
 * A Fixed Page cannot be moved: the rest of the site links to its address
 * and the build fails without it (docs/adr/0001). Everything else about it
 * stays the owner's to edit.
 */
export const keepFixedPageAddress: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const current: unknown = originalDoc?.slug;
  const next: unknown = data.slug;
  if (typeof current !== 'string' || !isFixedPage(current)) {
    return data;
  }
  if (next !== undefined && next !== current) {
    throw new ValidationError({
      errors: [
        {
          message: `The ${current} Page is a Fixed Page: the site depends on finding it at this address, so it cannot be moved.`,
          path: 'slug',
        },
      ],
    });
  }
  return data;
};
