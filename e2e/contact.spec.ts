/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { expect, test } from '@playwright/test';

test('contact happy path with services picker', async ({ page }) => {
  await page.goto('/contact?reason=services&service=ai-enablement');
  // Scoped to the contact form: the page also renders the newsletter form,
  // which has its own 'email' label and Turnstile widget.
  const form = page.locator('form').filter({ hasText: 'send-message' });
  await expect(form.getByText('AI engineering enablement')).toBeVisible();
  await page.getByRole('button', { name: /select services/ }).click();
  // The services dialog is portaled outside the form, so it stays page-scoped.
  await page.getByRole('checkbox', { name: 'Full-stack product development' }).check();
  await page.getByRole('button', { name: 'done' }).click();
  await form.getByLabel('name').fill('E2E Tester');
  await form.getByLabel('email').fill('e2e@example.com');
  await form.getByLabel('message').fill('End-to-end check of the contact flow.');
  // The Turnstile test key auto-solves; wait for the token, not a fixed delay.
  await expect(form.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, {
    timeout: 20_000,
  });
  await form.getByRole('button', { name: /send-message/ }).click();
  await expect(page.getByText('message queued ✓')).toBeVisible({
    timeout: 15_000,
  });
});
