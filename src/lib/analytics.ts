/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { sendGAEvent } from '@next/third-parties/google';

import { hasAnalyticsConsent } from '@/lib/consent/consent-storage';
import type { ContactReason } from '@/lib/validation/contact';

/**
 * Every custom analytics event the site can emit, with its parameters.
 * Adding an event means adding a key here; call sites stay type-checked.
 * Names are snake_case per GA4 convention; `generate_lead` is GA4's
 * recommended event name for lead-form submissions.
 */
interface AnalyticsEventMap {
  cv_download: { format: 'pdf' };
  generate_lead: { reason: ContactReason };
  newsletter_signup: Record<string, never>;
  request_quote_click: { service: string };
}

/**
 * Sends a custom GA4 event. A no-op unless NEXT_PUBLIC_GA_MEASUREMENT_ID is
 * set (production only) AND the visitor granted analytics consent — events
 * fired before a consent decision are dropped by design, not queued.
 */
export const trackEvent = <Name extends keyof AnalyticsEventMap>(
  name: Name,
  params: AnalyticsEventMap[Name]
): void => {
  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    return;
  }
  if (!hasAnalyticsConsent()) {
    return;
  }
  sendGAEvent('event', name, params);
};
