/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CONSENT_MODE_BOOTSTRAP } from '@/lib/consent/gtag';

/**
 * Parse-time Consent Mode v2 bootstrap: denies every signal by default and
 * defines the global gtag queue before any analytics script could load.
 * A static, compile-time string — nothing user-controlled is interpolated.
 */
export const ConsentModeScript = () => (
  <script dangerouslySetInnerHTML={{ __html: CONSENT_MODE_BOOTSTRAP }} />
);
