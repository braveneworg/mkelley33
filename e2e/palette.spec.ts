/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { expect, test } from '@playwright/test';

test('command palette navigates to services', async ({ page }) => {
  await page.goto('/');
  const dialog = page.getByRole('dialog');
  // The palette is a `dynamic(..., { ssr: false })` chunk, so its keydown
  // listener attaches after an async load — retry the hotkey until it lands.
  await expect(async () => {
    await page.keyboard.press('ControlOrMeta+k');
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  // Scoped to the dialog: the site nav renders an identical './services' link.
  await dialog.getByText('./services').click();
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.getByRole('heading', { name: /services/ })).toBeVisible();
});
