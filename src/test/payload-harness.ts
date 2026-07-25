import type { Payload } from 'payload';

import { MongoMemoryServer } from 'mongodb-memory-server';

export interface TestPayload {
  payload: Payload;
  teardown: () => Promise<void>;
}

/**
 * Boots Payload against an in-memory MongoDB. Env vars must be set BEFORE
 * the payload config module is evaluated, so the config is imported
 * dynamically here — callers must not import `@payload-config` themselves.
 */
export async function createTestPayload(): Promise<TestPayload> {
  const mongod = await MongoMemoryServer.create();
  process.env.DATABASE_URL = mongod.getUri();
  process.env.PAYLOAD_SECRET ??= 'test-secret';
  const { getPayload } = await import('payload');
  const { default: config } = await import('@payload-config');
  const payload = await getPayload({ config });
  return {
    payload,
    teardown: async () => {
      await payload.destroy();
      await mongod.stop();
    },
  };
}
