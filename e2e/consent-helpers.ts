/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CONSENT_STORAGE_KEY, CONSENT_VERSION } from '../src/lib/consent/consent-storage';

import type { Page } from '@playwright/test';

/**
 * Seeds a decided, declined consent record before any page script runs, so
 * flows under test never meet the banner and never load analytics.
 */
export const seedDecidedConsent = async (page: Page): Promise<void> => {
  const value = JSON.stringify({
    analytics: false,
    decidedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  });
  await page.addInitScript(
    ({ key, record }: { key: string; record: string }) => {
      window.localStorage.setItem(key, record);
    },
    { key: CONSENT_STORAGE_KEY, record: value }
  );
};
