import config from '@payload-config';
import { getPayload } from 'payload';

import { seedServices } from '@/lib/services-seed';

async function run(): Promise<void> {
  const payload = await getPayload({ config });
  const result = await seedServices(payload);
  console.log(
    `seed:services done — created: [${result.created.join(', ')}], updated: [${result.updated.join(', ')}]`,
  );
  process.exit(0);
}

run().catch((error: unknown) => {
  console.error(`seed:services failed — ${String(error)}`);
  process.exit(1);
});
