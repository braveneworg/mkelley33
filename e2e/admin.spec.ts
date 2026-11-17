/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { expect, test } from '@playwright/test';

// The Payload admin is where `next`, `payload` and the generated import map
// meet, and nothing else in the suite loads it. Both production admin
// outages on record answered HTTP 200 with a tree that never rendered
// (docs/lessons/deploy/env-gated-plugin-stale-import-map.md), so a status
// check proves nothing — the form has to actually be on the page.
test('payload admin renders its entry form', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto('/admin');

  // An empty users collection lands on create-first-user, a seeded one on
  // login. The harness seeds no user today; either is a rendered admin.
  await expect(page).toHaveURL(/\/admin\/(create-first-user|login)$/);
  await expect(page.getByLabel(/email/i)).toBeVisible();
  expect(pageErrors).toEqual([]);
});
