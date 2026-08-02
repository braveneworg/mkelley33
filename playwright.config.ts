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
    // Fallback matches the harness's dedicated port (E2E_PORT in
    // src/lib/e2e/harness-config.ts) —
    // never Next's default 3000, where a stray dev server could listen.
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4310',
    trace: 'retain-on-failure',
  },
  // Single worker: the specs share one server + database, and the dev/CI
  // hosts running the full build alongside the suite are memory-constrained.
  workers: 1,
});
