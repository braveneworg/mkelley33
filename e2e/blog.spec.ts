/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { expect, test } from '@playwright/test';

test('migrated post renders with terminal code blocks', async ({ page }) => {
  await page.goto('/blog/create-a-nextjs-blog');
  await expect(
    // Real migrated title: "How to create a Next.js 14.1 blog using MDX markdown".
    page.getByRole('heading', { name: /create a next\.js 14\.1 blog/i })
  ).toBeVisible();
  await expect(page.locator('pre.shiki').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /copy/i }).first()).toBeVisible();
});
