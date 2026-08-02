/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import { Analytics } from '@vercel/analytics/next';

import { useConsent } from '@/components/consent/consent-provider';

/**
 * Vercel Analytics is cookieless, but this site gates it behind the same
 * analytics consent as GA: "analytics: off" means off — nothing loads and
 * nothing is sent for visitors who declined or have not decided.
 */
export const VercelAnalyticsTag = () => {
  const { analyticsGranted } = useConsent();

  return analyticsGranted ? <Analytics /> : null;
};
