/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { MongoMemoryServer } from 'mongodb-memory-server';

import { retryOnPortCollision } from '@/test/retry-port-collision';

import type { MongooseAdapter } from '@payloadcms/db-mongodb';
import type { Payload } from 'payload';

export interface TestPayload {
  payload: Payload;
  /**
   * Empties the database and the uploads directory, so a test can start from
   * nothing without paying for a second Payload boot. Call it in `beforeEach`
   * when tests in one file write: each then arranges its own state and none
   * depends on the order they run in.
   */
  reset: () => Promise<void>;
  teardown: () => Promise<void>;
}

/**
 * Boots Payload against an in-memory MongoDB. Env vars must be set BEFORE
 * the payload config module is evaluated, so the config is imported
 * dynamically here — callers must not import `@payload-config` themselves.
 */
export const createTestPayload = async (): Promise<TestPayload> => {
  const mongod = await retryOnPortCollision(() => MongoMemoryServer.create());
  process.env.DATABASE_URL = mongod.getUri();
  process.env.PAYLOAD_SECRET ??= 'test-secret';
  // Uploads land in a directory of this spec's own, not in the working tree.
  const uploadsDir = mkdtempSync(path.join(tmpdir(), 'payload-uploads-'));
  process.env.UPLOADS_DIR = uploadsDir;
  const { getPayload } = await import('payload');
  const { default: config } = await import('@payload-config');
  const payload = await getPayload({ config });
  return {
    payload,
    reset: async () => {
      // The adapter is the Mongo one by construction: this harness booted it.
      const adapter = payload.db as MongooseAdapter;
      await adapter.connection.dropDatabase();
      // Dropping the database drops its indexes too, and with them every
      // `unique: true` — put them back, or a test of a duplicate passes
      // against a database that would have refused it.
      await Promise.all(Object.values(adapter.collections).map((model) => model.createIndexes()));
      // Payload names an upload around files already on disk, so a leftover
      // file would rename the next test's upload.
      rmSync(uploadsDir, { force: true, recursive: true });
      mkdirSync(uploadsDir, { recursive: true });
    },
    teardown: async () => {
      await payload.destroy();
      await mongod.stop();
      rmSync(uploadsDir, { force: true, recursive: true });
    },
  };
};
