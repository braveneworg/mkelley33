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
