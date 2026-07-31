/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { missingSeedEnv, seedFirstUser } from '@/lib/first-user-seed';

import type { Payload } from 'payload';

const fakePayload = (docs: { id: string }[]) => {
  const find = vi.fn().mockResolvedValue({ docs });
  const create = vi.fn().mockResolvedValue({ id: 'u1' });
  return { create, find, payload: { create, find } as unknown as Payload };
};

describe('seedFirstUser', () => {
  const input = { email: 'admin@example.com', password: 'a-long-enough-secret' };

  it('creates the first user on an empty collection', async () => {
    const { create, payload } = fakePayload([]);
    const result = await seedFirstUser(payload, input);
    expect(create).toHaveBeenCalledWith({ collection: 'users', data: input });
    expect(result).toEqual({ created: true });
  });

  it('no-ops when a user already exists', async () => {
    const { create, payload } = fakePayload([{ id: 'existing' }]);
    const result = await seedFirstUser(payload, input);
    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({ created: false });
  });
});

describe('missingSeedEnv', () => {
  it('returns nothing when the payload env is present', () => {
    const env = { DATABASE_URL: 'mongodb://localhost/db', PAYLOAD_SECRET: 'a-secret' };
    expect(missingSeedEnv(env)).toEqual([]);
  });

  it('names every var that is unset or empty', () => {
    expect(missingSeedEnv({ DATABASE_URL: '' })).toEqual(['DATABASE_URL', 'PAYLOAD_SECRET']);
  });
});
