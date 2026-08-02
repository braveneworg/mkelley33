/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node
// jsdom defines `document` non-configurably, so the non-browser guard can
// only be exercised in an environment that genuinely lacks it — the server
// render, where this module is imported but never has cookies to expire.

import { deleteGaCookies, reloadPage, updateAnalyticsConsent } from '@/lib/consent/gtag';

describe('consent gtag helpers outside the browser', () => {
  it('deleteGaCookies is a no-op where there is no document', () => {
    expect(() => deleteGaCookies()).not.toThrow();
  });

  // The DOM lib types `globalThis.location` as always present; in Node it is
  // undefined, so the default argument resolves to nothing and the call has
  // to survive it — same convention as its two siblings here.
  it('reloadPage is a no-op where there is no location', () => {
    expect(() => reloadPage()).not.toThrow();
  });

  it('updateAnalyticsConsent is a no-op where there is no gtag', () => {
    expect(() => updateAnalyticsConsent(true)).not.toThrow();
  });
});
