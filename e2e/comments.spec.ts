/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { expect, test } from '@playwright/test';

import { seedDecidedConsent } from './consent-helpers';

const COMMENT_BODY = 'End-to-end comment — checking the moderation queue.';

test.beforeEach(async ({ page }) => {
  await seedDecidedConsent(page);
});

test('comment queues for moderation and never publishes itself', async ({ page }) => {
  await page.goto('/blog/e2e-post');
  // Scoped to the comment form: the page can also render other forms (each
  // with its own labels and Turnstile widget).
  const form = page.locator('form').filter({ hasText: 'post comment' });
  await form.getByLabel('name', { exact: true }).fill('E2E Commenter');
  await form.getByLabel('comment').fill(COMMENT_BODY);
  // The Turnstile test key auto-solves; wait for the token, not a fixed delay.
  await expect(form.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, {
    timeout: 20_000,
  });
  await form.getByRole('button', { name: /post comment/ }).click();
  await expect(page.getByText('comment queued — appears once approved ✓')).toBeVisible({
    timeout: 15_000,
  });
  // The stored comment is pending, so a fresh render must not publish it.
  await page.reload();
  await expect(page.getByRole('heading', { name: /comments \(0\)/ })).toBeVisible();
  await expect(page.getByText(COMMENT_BODY)).not.toBeVisible();
});
