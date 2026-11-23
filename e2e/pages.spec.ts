/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { expect, test } from '@playwright/test';

import { seedDecidedConsent } from './consent-helpers';

/**
 * Pages come out of the database, and the pictures on them out of the Media
 * library. Only a real server proves the chain: Seed → Pages and uploads →
 * the routes that render them → the image optimizer.
 */

test.beforeEach(async ({ page }) => {
  await seedDecidedConsent(page);
});

test('the home Page renders its Blocks from the Seed', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Michaux Kelley');
  await expect(page.getByRole('heading', { name: 'cat ./about.md' })).toBeVisible();
});

test('the headshot the Seed uploaded is served', async ({ page }) => {
  await page.goto('/');

  const headshot = page.getByRole('img', { name: 'Michaux Kelley' });
  await headshot.scrollIntoViewIfNeeded();
  await expect(headshot).toBeVisible();
  // A picture the optimizer could not fetch still occupies its box; only a
  // decoded one has a width of its own.
  await expect
    .poll(() => headshot.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
});

test('the header shows the menu from Site settings', async ({ page }) => {
  await page.goto('/');

  const header = page.getByRole('navigation', { name: 'Primary' });
  await expect(header.getByRole('link', { name: './cv' })).toHaveAttribute('href', '/cv');
});

test('a Page that is not a Fixed Page is served at its address', async ({ page }) => {
  await page.goto('/uses');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('# uses');
  await expect(page.getByRole('heading', { name: 'hardware/' })).toBeVisible();
});

test('the home Page has no second address', async ({ request }) => {
  const response = await request.get('/home');

  expect(response.status()).toBe(404);
});

test('an address with no Page is a 404', async ({ request }) => {
  const response = await request.get('/no-such-page');

  expect(response.status()).toBe(404);
});

/** Draft mode is what shows unpublished work, so a link alone must not switch it on. */
test('the preview refuses a visitor who is not signed in', async ({ request }) => {
  const response = await request.get('/preview?path=%2F', { maxRedirects: 0 });

  expect(response.status()).toBe(403);
});
