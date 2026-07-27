/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

test('newsletter opt-in confirm round trip', async ({ page }) => {
  await page.goto('/');
  const form = page.locator('form').filter({ hasText: 'subscribe' });
  await form.getByLabel('email').fill('optin@example.com');
  // The Turnstile test key auto-solves; wait for the token, not a fixed delay.
  await expect(form.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, {
    timeout: 20_000,
  });
  await form.getByRole('button', { name: /subscribe/ }).click();
  await expect(page.getByText(/check your inbox to confirm/)).toBeVisible({
    timeout: 15_000,
  });
  let token = '';
  await expect(async () => {
    const log = await readFile('e2e-server.log', 'utf8');
    const match = /\/newsletter\/confirm\?token=([0-9a-f]{64})/.exec(log);
    if (!match) {
      throw new Error('confirm link not in server log yet');
    }
    token = match[1];
  }).toPass({ timeout: 15_000 });
  await page.goto(`/newsletter/confirm?token=${token}`);
  await expect(page.getByText('subscribed ✓')).toBeVisible();
});
