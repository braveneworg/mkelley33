/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { getPayload } from 'payload';

import config from '@payload-config';

import { seedServices } from '@/lib/services-seed';

const run = async (): Promise<void> => {
  const payload = await getPayload({ config });
  const result = await seedServices(payload);
  console.info(
    `seed:services done — created: [${result.created.join(', ')}], updated: [${result.updated.join(', ')}]`
  );
  process.exit(0);
};

run().catch((error: unknown) => {
  console.error(`seed:services failed — ${String(error)}`);
  process.exit(1);
});
