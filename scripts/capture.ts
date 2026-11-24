/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * `pnpm capture` — rewrites the Seed in `seed/` from what the database
 * `DATABASE_URL` names currently publishes (Capture, in `CONTEXT.md`). Run
 * by the owner against the live site, from a branch: the working tree is
 * the only thing it changes, so `git diff seed/` is the review, and the
 * result goes through a PR and the gate like any other change.
 *
 * It reads the database and writes nothing to it. With the live database
 * it needs `BLOB_READ_WRITE_TOKEN` too, to fetch the pictures and the
 * Resume from storage.
 */

import { getPayload } from 'payload';

import config from '@payload-config';

import { captureSeed } from '@/lib/seed/capture-seed';
import { knownSeedFiles, writeSeed } from '@/lib/seed/write-seed';

const SEED_DIRECTORY = 'seed';

const run = async (): Promise<void> => {
  const payload = await getPayload({ config });
  const captured = await captureSeed(payload, await knownSeedFiles(SEED_DIRECTORY));
  await writeSeed(SEED_DIRECTORY, captured);
  const { content, files, leftOut } = captured;
  console.info(
    [
      `capture done — ${SEED_DIRECTORY}/ now holds what the site publishes`,
      `  pages: [${content.pages.map(({ slug }) => slug).join(', ')}]`,
      `  posts: [${content.posts.map(({ slug }) => slug).join(', ')}]`,
      `  services: [${content.services.map(({ slug }) => slug).join(', ')}]`,
      `  files: [${[...files.keys()].join(', ')}]`,
    ].join('\n')
  );
  for (const item of leftOut) {
    console.warn(`capture: left out — ${item}`);
  }
  process.exit(0);
};

run().catch((error: unknown) => {
  console.error(`capture failed — ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
