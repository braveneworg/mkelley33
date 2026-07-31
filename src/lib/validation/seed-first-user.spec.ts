/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { seedFirstUserSchema } from '@/lib/validation/seed-first-user';

describe('seedFirstUserSchema', () => {
  const valid = { email: 'admin@example.com', password: 'a-long-enough-secret' };

  it('accepts a valid email and password', () => {
    expect(seedFirstUserSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a malformed email', () => {
    expect(seedFirstUserSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false);
  });

  it('rejects a password shorter than 12 characters', () => {
    expect(seedFirstUserSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
  });

  it('rejects missing values, as when the env vars are unset', () => {
    expect(seedFirstUserSchema.safeParse({}).success).toBe(false);
  });
});
