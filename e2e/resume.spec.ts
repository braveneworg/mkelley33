/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { expect, test } from '@playwright/test';

import { seedDecidedConsent } from './consent-helpers';

/**
 * The Resume is an upload the Seed creates, served at an address that never
 * changes. Only a real server proves the chain: Seed → storage → Site
 * settings → the route that passes the file through.
 */
test('the Resume address serves the seeded PDF', async ({ request }) => {
  const response = await request.get('/michaux-kelley-resume.pdf');

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('application/pdf');
  // Every PDF opens with this marker; a served error page would not.
  expect((await response.body()).subarray(0, 5).toString('latin1')).toBe('%PDF-');
});

test('the CV page links to the Resume address', async ({ page }) => {
  await seedDecidedConsent(page);
  await page.goto('/cv');

  await expect(page.getByRole('link', { name: /download resume \(pdf\)/i })).toHaveAttribute(
    'href',
    '/michaux-kelley-resume.pdf'
  );
});
