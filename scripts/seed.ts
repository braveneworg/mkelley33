/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * `pnpm seed` — fills the database `DATABASE_URL` names from the Seed in
 * `seed/`. Fill-only: it creates what is missing and never changes a record
 * that exists, so it is safe to run against the live site, and it must be
 * run there before a deploy whose code needs new records (docs/adr/0001).
 *
 * The harnesses call this file directly, with their own throwaway database
 * in the environment and no env file.
 */

import { getPayload } from 'payload';

import config from '@payload-config';

import { fillSeed } from '@/lib/seed/fill-seed';
import { localDiskWarning } from '@/lib/seed/local-disk-warning';
import { loadSeed } from '@/lib/seed/seed-files';

const SEED_DIRECTORY = 'seed';

const run = async (): Promise<void> => {
  const seed = loadSeed(SEED_DIRECTORY);
  const payload = await getPayload({ config });
  const report = await fillSeed(payload, seed);
  const { created, kept } = report;
  console.info(`seed done — created: [${created.join(', ')}], kept: [${kept.join(', ')}]`);
  const warning = localDiskWarning(
    report,
    seed.siteSettings.resume,
    process.env.BLOB_READ_WRITE_TOKEN
  );
  if (warning !== null) {
    console.warn(`seed: ${warning}`);
  }
  process.exit(0);
};

run().catch((error: unknown) => {
  console.error(`seed failed — ${String(error)}`);
  process.exit(1);
});
