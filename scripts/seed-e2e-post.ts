/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { getPayload } from 'payload';

import config from '@payload-config';

import { seedE2ePost } from '@/lib/e2e/post-seed';

const run = async (): Promise<void> => {
  const payload = await getPayload({ config });
  const result = await seedE2ePost(payload);
  console.info(`seed:e2e-post done — created: ${String(result.created)}`);
  process.exit(0);
};

run().catch((error: unknown) => {
  console.error(`seed:e2e-post failed — ${String(error)}`);
  process.exit(1);
});
