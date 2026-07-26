/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  reporter: process.env.CI ? 'github' : 'list',
  retries: process.env.CI ? 1 : 0,
  testDir: 'e2e',
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  // Single worker: the specs share one server + database, and the dev/CI
  // hosts running the full build alongside the suite are memory-constrained.
  workers: 1,
});
