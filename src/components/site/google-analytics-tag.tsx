/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import { GoogleAnalytics } from '@next/third-parties/google';

import { useConsent } from '@/components/consent/consent-provider';

/**
 * Mounts the GA4 tag only when BOTH gates open: the measurement id exists
 * (production Vercel env only — dev, preview, CI, and E2E never have it)
 * AND the visitor granted analytics consent. Until then zero bytes go to
 * Google. The provider pushes the Consent Mode `granted` update before
 * this mounts, so gtag.js boots with the correct consent state.
 */
export const GoogleAnalyticsTag = () => {
  const { analyticsGranted } = useConsent();
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return gaMeasurementId && analyticsGranted ? <GoogleAnalytics gaId={gaMeasurementId} /> : null;
};
