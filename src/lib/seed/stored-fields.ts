/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { MongooseAdapter } from '@payloadcms/db-mongodb';
import type { Payload } from 'payload';

/**
 * The field names the stored record of a global actually has, or null when
 * the global has no record.
 *
 * This is the one question Payload's own API cannot answer. It reads an
 * array field that was never stored as `[]`, the same as one the owner
 * emptied on purpose — and the Seed must fill the first and leave the
 * second alone. Only the stored record tells them apart: a record saved
 * before a field existed does not have it, and every save after writes it.
 *
 * The database is MongoDB by construction (`src/payload.config.ts`).
 */
export const storedGlobalFields = async (
  payload: Payload,
  slug: string
): Promise<null | ReadonlySet<string>> => {
  const { connection } = payload.db as MongooseAdapter;
  const record = await connection.collection('globals').findOne({ globalType: slug });
  return record === null ? null : new Set(Object.keys(record));
};
