import path from 'path';

import { getPayload } from 'payload';

import config from '@payload-config';

import { migratePosts } from '@/lib/migration/migrate-posts';

const run = async (): Promise<void> => {
  try {
    const payload = await getPayload({ config });
    const result = await migratePosts(payload, path.resolve(process.cwd(), 'scripts/content'));
    payload.logger.info(
      `migration complete — created: [${result.created.join(', ')}] updated: [${result.updated.join(', ')}]`
    );
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`migrate:posts failed — ${message}`);
    process.exit(1);
  }
};

void run();
