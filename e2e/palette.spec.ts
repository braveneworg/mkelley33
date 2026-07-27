/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { expect, test } from '@playwright/test';

test('command palette navigates to services', async ({ page }) => {
  await page.goto('/');
  const dialog = page.getByRole('dialog');
  // A SINGLE press must open the palette — no retry. The inline hotkey
  // bridge (palette-hotkey.tsx) buffers a press that lands before the
  // dynamic palette chunk hydrates and replays it once the chunk mounts.
  await page.keyboard.press('ControlOrMeta+k');
  await expect(dialog).toBeVisible();
  // Scoped to the dialog: the site nav renders an identical './services' link.
  await dialog.getByText('./services').click();
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.getByRole('heading', { name: /services/ })).toBeVisible();
});
