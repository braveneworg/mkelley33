/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { z } from 'zod';

export const seedFirstUserSchema = z.object({
  email: z.email('enter a valid email').max(254),
  password: z.string('set SEED_ADMIN_PASSWORD').min(12, 'use at least 12 characters'),
});

export type SeedFirstUserValues = z.infer<typeof seedFirstUserSchema>;
