/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Seeds the initial admin user from environment variables. Safe to re-run —
 * with any user already present it exits 0 without touching the collection.
 *
 * Reads SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD from the shell, and
 * DATABASE_URL / PAYLOAD_SECRET like the app does (`pnpm run seed:first-user`
 * loads `.env.local` when present; shell values win). `.env.local` is read
 * from the CURRENT directory only — a fresh worktree has none, so there the
 * values must come from the shell. To seed production, export the production
 * DATABASE_URL and PAYLOAD_SECRET — never put them in a committed file. The
 * password itself is never printed.
 */

import { getPayload } from 'payload';

import config from '@payload-config';

import { missingSeedEnv, seedFirstUser } from '@/lib/first-user-seed';
import { seedFirstUserSchema } from '@/lib/validation/seed-first-user';

const run = async (): Promise<void> => {
  const missing = missingSeedEnv({
    DATABASE_URL: process.env.DATABASE_URL,
    PAYLOAD_SECRET: process.env.PAYLOAD_SECRET,
  });
  if (missing.length > 0) {
    console.error(`seed:first-user missing env — set ${missing.join(' and ')}`);
    console.error(
      '.env.local is read from the current directory only (a fresh worktree has none) — export the values in the shell or run where .env.local exists'
    );
  }
  const parsed = seedFirstUserSchema.safeParse({
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')} — ${issue.message}`);
    console.error(`seed:first-user invalid input: ${issues.join('; ')}`);
    console.error('set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD, then retry');
  }
  if (missing.length > 0 || !parsed.success) {
    process.exit(1);
  }
  const payload = await getPayload({ config });
  const result = await seedFirstUser(payload, parsed.data);
  console.info(
    result.created
      ? `seed:first-user done — created ${parsed.data.email}`
      : 'seed:first-user skipped — a user already exists'
  );
  process.exit(0);
};

run().catch((error: unknown) => {
  console.error(`seed:first-user failed — ${String(error)}`);
  process.exit(1);
});
