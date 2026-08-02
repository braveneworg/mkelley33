/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { GoogleAnalytics } from '@next/third-parties/google';

/**
 * Mounts the GA4 tag only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set — the
 * variable exists solely in the production Vercel environment, so dev,
 * preview, CI, and E2E runs never load the script or send hits.
 */
export const GoogleAnalyticsTag = () => {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return gaMeasurementId ? <GoogleAnalytics gaId={gaMeasurementId} /> : null;
};
