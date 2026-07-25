import config from '@payload-config';
import path from 'path';
import { getPayload } from 'payload';

import { migratePosts } from '@/lib/migration/migrate-posts';

async function run(): Promise<void> {
  const payload = await getPayload({ config });
  const result = await migratePosts(
    payload,
    path.resolve(process.cwd(), 'scripts/content'),
  );
  payload.logger.info(
    `migration complete — created: [${result.created.join(', ')}] updated: [${result.updated.join(', ')}]`,
  );
  process.exit(0);
}

void run();
