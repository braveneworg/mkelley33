/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { expect, test } from '@playwright/test';

import { seedDecidedConsent } from './consent-helpers';
import { CONSENT_STORAGE_KEY } from '../src/lib/consent/consent-storage';

test('banner gates analytics until a custom save decision', async ({ page }) => {
  await page.goto('/');
  const banner = page.getByRole('region', { name: 'cookie consent' });
  await expect(banner).toBeVisible();
  await expect(page.locator('script[src*="_vercel/insights"]')).toHaveCount(0);

  await banner.getByRole('button', { name: 'customize' }).click();
  const dialog = page.getByRole('dialog', { name: 'cookie preferences' });
  await expect(dialog).toBeVisible();
  // The switch is a visually-hidden checkbox behind an ASCII glyph, and that
  // glyph is what a visitor actually clicks — checking the input directly
  // fails its actionability check ("[ ] intercepts pointer events"), so
  // clicking the label is both the real gesture and the working one.
  await dialog.locator('label').filter({ hasText: 'off' }).click();
  await expect(dialog.getByRole('checkbox', { exact: true, name: 'on' })).toBeChecked();
  await dialog.getByRole('button', { name: 'save preferences' }).click();
  await expect(banner).toBeHidden();

  const stored = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    CONSENT_STORAGE_KEY
  );
  expect(JSON.parse(stored ?? '{}')).toMatchObject({ analytics: true, version: 1 });
});

test('accepting all mounts vercel analytics', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'accept all' }).click();
  await expect(page.locator('script[src*="_vercel/insights"]')).toHaveCount(1);
});

test('the corner trigger reopens preferences after a decision', async ({ page }) => {
  await seedDecidedConsent(page);
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'cookie consent' })).toHaveCount(0);
  const trigger = page.getByRole('button', { name: 'cookie preferences' });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'cookie preferences' })).toBeVisible();
});

test('declining keeps analytics unloaded and shows the privacy page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'decline all' }).click();
  await expect(page.locator('script[src*="_vercel/insights"]')).toHaveCount(0);
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1, name: /privacy/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'manage cookie preferences' })).toBeVisible();
});

test('consent mode is denied by default in the initial HTML response', async ({ page }) => {
  // The raw response body, not the hydrated DOM: this is the only proof the
  // bootstrap runs at parse time rather than being injected by client code
  // after GA could already have loaded. Asserted as literals rather than
  // against CONSENT_MODE_BOOTSTRAP so that rewriting the bootstrap — an
  // arrow function, which cannot produce the `arguments` object gtag.js
  // requires, or a dropped `default` command — fails here instead of
  // silently agreeing with itself.
  const response = await page.request.get('/');
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain('function gtag(){dataLayer.push(arguments);}');
  expect(html).toContain("'consent','default'");
});

test('the sitemap lists the privacy page', async ({ page }) => {
  const response = await page.request.get('/sitemap.xml');
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain('/privacy');
});
