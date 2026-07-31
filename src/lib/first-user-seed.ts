/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { SeedFirstUserValues } from '@/lib/validation/seed-first-user';

import type { Payload } from 'payload';

export interface SeedFirstUserResult {
  created: boolean;
}

export interface SeedEnv {
  DATABASE_URL?: string;
  PAYLOAD_SECRET?: string;
}

/**
 * Names of the Payload env vars the seed script needs but cannot validate by
 * value — presence only, so nothing secret can leak through the return.
 * Destructured rather than looped to keep computed member access (and the
 * security/detect-object-injection rule) out of the picture.
 */
export const missingSeedEnv = ({ DATABASE_URL, PAYLOAD_SECRET }: SeedEnv): string[] => [
  ...(DATABASE_URL ? [] : ['DATABASE_URL']),
  ...(PAYLOAD_SECRET ? [] : ['PAYLOAD_SECRET']),
];

/**
 * Creates the initial admin user, but only into an empty collection — with
 * any user present it is a no-op, so re-running can never add an account or
 * touch an existing one.
 */
export const seedFirstUser = async (
  payload: Payload,
  { email, password }: SeedFirstUserValues
): Promise<SeedFirstUserResult> => {
  const existing = await payload.find({ collection: 'users', limit: 1 });
  if (existing.docs.length > 0) {
    return { created: false };
  }
  await payload.create({ collection: 'users', data: { email, password } });
  return { created: true };
};
