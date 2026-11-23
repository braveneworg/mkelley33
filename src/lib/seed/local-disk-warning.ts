/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { SeedReport } from '@/lib/seed/fill-seed';

/**
 * What to tell whoever ran the Seed when it uploaded files without blob
 * storage, or null when there is nothing to say.
 *
 * Without `BLOB_READ_WRITE_TOKEN` Payload writes uploads to the local disk.
 * That is right for the harnesses and wrong against the live database: the
 * record is created there while the file stays on the machine that ran the
 * Seed, and the site answers 502 for a Resume, or shows a broken picture,
 * that it cannot find. The Seed will not repair it on a second run, because
 * the record then exists.
 */
export const localDiskWarning = (
  { uploads }: Pick<SeedReport, 'uploads'>,
  blobToken: string | undefined
): null | string => {
  if (uploads === 0 || blobToken) {
    return null;
  }
  return (
    `${String(uploads)} file(s) were uploaded to this machine's disk, because ` +
    'BLOB_READ_WRITE_TOKEN is not set. That is expected for a throwaway database. If this ' +
    'was the live database, upload them again in the admin: the Resume under Site settings, ' +
    'a picture in the Block that shows it.'
  );
};
