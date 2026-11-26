/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { expect, test } from '@playwright/test';

import { seedDecidedConsent } from './consent-helpers';

/** A common small phone, below the `sm` breakpoint where the menu folds. */
const PHONE = { height: 812, width: 375 };

/** The jump offset on phones: `scroll-pt-20`. */
const PHONE_JUMP_OFFSET_PX = 80;

test.beforeEach(async ({ page }) => {
  await seedDecidedConsent(page);
});

test('the header stays at the top of the viewport while the page scrolls', async ({ page }) => {
  await page.goto('/services');
  await page.mouse.wheel(0, 1500);

  await expect.poll(async () => (await page.getByRole('banner').boundingBox())?.y).toBe(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: PHONE });

  test('the links stay hidden until the green hamburger opens them', async ({ page }) => {
    await page.goto('/');
    const blog = page.getByRole('navigation', { name: 'Primary' }).getByRole('link', {
      name: './blog',
    });
    await expect(blog).toBeHidden();

    await page.getByRole('button', { name: 'Open menu' }).click();

    await expect(blog).toBeVisible();
  });

  test('following a link in the menu closes it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: './blog' })
      .click();

    await expect(page).toHaveURL(/\/blog$/);
    await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  test('the header is one row tall, so a jumped-to section clears it', async ({ page }) => {
    await page.goto('/services');

    const height = (await page.getByRole('banner').boundingBox())?.height ?? Infinity;

    expect(height).toBeLessThan(PHONE_JUMP_OFFSET_PX);
  });
});
