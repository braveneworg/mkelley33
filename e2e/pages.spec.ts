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

/**
 * Every line of the CV is rich text, stored by the Seed and rendered by the
 * site's own text component. A real server shows the words come out the
 * other end as words.
 */
test('the CV shows the text the Seed carries', async ({ page }) => {
  await page.goto('/cv');

  await expect(page.getByRole('heading', { level: 2, name: 'Professional summary' })).toBeVisible();
  await expect(
    page.getByText(/^Senior full-stack software engineer with 10\+ years/)
  ).toBeVisible();
});

/**
 * The privacy policy is a Page too, with two Blocks the owner cannot type
 * into (docs/adr/0002). A real server shows the whole chain: the Seed's
 * text, the consent code's own table, and a button that works once the
 * page has hydrated.
 */
test('the privacy Page shows the policy with what the site stores', async ({ page }) => {
  await page.goto('/privacy');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('# privacy');
  await expect(page.getByRole('heading', { level: 2, name: 'retention' })).toBeVisible();
  await expect(page.getByRole('cell', { exact: true, name: '_ga' })).toBeVisible();
});

test('the privacy Page says when it was last published', async ({ page }) => {
  await page.goto('/privacy');

  // The harness seeded and published it moments ago; the date is not typed.
  await expect(page.getByRole('main').getByText(/Last updated \d{4}-\d{2}-\d{2}\./)).toBeVisible();
});

test('the privacy Page reopens the cookie form', async ({ page }) => {
  await page.goto('/privacy');

  await page.getByRole('button', { name: 'manage cookie preferences' }).click();

  await expect(page.getByRole('dialog', { name: 'cookie preferences' })).toBeVisible();
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
