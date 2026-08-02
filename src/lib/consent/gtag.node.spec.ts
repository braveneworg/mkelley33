/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node
// jsdom defines `document` non-configurably, so the non-browser guard can
// only be exercised in an environment that genuinely lacks it — the server
// render, where this module is imported but never has cookies to expire.

import { deleteGaCookies, updateAnalyticsConsent } from '@/lib/consent/gtag';

describe('consent gtag helpers outside the browser', () => {
  it('deleteGaCookies is a no-op where there is no document', () => {
    expect(() => deleteGaCookies()).not.toThrow();
  });

  it('updateAnalyticsConsent is a no-op where there is no gtag', () => {
    expect(() => updateAnalyticsConsent(true)).not.toThrow();
  });
});
