/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { SITE_SETTINGS_LABEL, type SeedReport } from '@/lib/seed/fill-seed';

/**
 * What to tell whoever ran the Seed when it uploaded the Resume without blob
 * storage, or null when there is nothing to say.
 *
 * Without `BLOB_READ_WRITE_TOKEN` Payload writes uploads to the local disk.
 * That is right for the harnesses and wrong against the live database: the
 * record is created there while the file stays on the machine that ran the
 * Seed, and the site answers 502 for a Resume it cannot find. The Seed will
 * not repair it on a second run, because the settings then exist.
 */
export const localDiskWarning = (
  { created }: SeedReport,
  seededResume: null | string,
  blobToken: string | undefined
): null | string => {
  const uploaded = seededResume !== null && created.includes(SITE_SETTINGS_LABEL);
  if (!uploaded || blobToken) {
    return null;
  }
  return (
    "the Resume was uploaded to this machine's disk, because BLOB_READ_WRITE_TOKEN is not set. " +
    'That is expected for a throwaway database. If this was the live database, upload the ' +
    'Resume again in the admin under Site settings.'
  );
};
