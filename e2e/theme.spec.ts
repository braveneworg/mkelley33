/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { expect, test } from '@playwright/test';

import { seedDecidedConsent } from './consent-helpers';

test.beforeEach(async ({ page }) => {
  await seedDecidedConsent(page);
});

test('defaults dark against a light OS and the toggle persists across reload', async ({ page }) => {
  // Light OS emulation proves the dark default wins over the system
  // preference, not merely mirrors it.
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});
