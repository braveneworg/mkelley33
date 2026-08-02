/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { expect, test } from '@playwright/test';

import { seedDecidedConsent } from './consent-helpers';

test.beforeEach(async ({ page }) => {
  await seedDecidedConsent(page);
});

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

test('palette input holds focus on open, so typing filters immediately', async ({ page }) => {
  await page.goto('/');
  const dialog = page.getByRole('dialog');
  await page.keyboard.press('ControlOrMeta+k');
  await expect(dialog).toBeVisible();
  // The input carries no autoFocus attribute — Radix moves focus into the
  // dialog content and the input is its first focusable child. Typing without
  // clicking first is the only way to prove that in a real browser; jsdom's
  // focus emulation in the unit spec cannot stand in for it.
  await page.keyboard.type('uses');
  await expect(dialog.getByPlaceholder(/type a command or search/)).toHaveValue('uses');
  await expect(dialog.getByText('./uses')).toBeVisible();
});
