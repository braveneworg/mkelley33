/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
  CONSENT_MODE_BOOTSTRAP,
  deleteGaCookies,
  reloadPage,
  updateAnalyticsConsent,
} from '@/lib/consent/gtag';

interface GtagGlobals {
  gtag?: (...args: unknown[]) => void;
}

describe('CONSENT_MODE_BOOTSTRAP', () => {
  it('defines the global gtag queue function', () => {
    expect(CONSENT_MODE_BOOTSTRAP).toContain('function gtag(){dataLayer.push(arguments);}');
  });

  it('defaults analytics_storage to denied', () => {
    expect(CONSENT_MODE_BOOTSTRAP).toContain("analytics_storage:'denied'");
  });

  it('defaults ad_storage to denied', () => {
    expect(CONSENT_MODE_BOOTSTRAP).toContain("ad_storage:'denied'");
  });

  it('defaults ad_user_data to denied', () => {
    expect(CONSENT_MODE_BOOTSTRAP).toContain("ad_user_data:'denied'");
  });

  it('defaults ad_personalization to denied', () => {
    expect(CONSENT_MODE_BOOTSTRAP).toContain("ad_personalization:'denied'");
  });
});

describe('updateAnalyticsConsent', () => {
  afterEach(() => {
    delete (globalThis as GtagGlobals).gtag;
  });

  it('pushes a granted analytics_storage update through gtag', () => {
    const calls: unknown[][] = [];
    (globalThis as GtagGlobals).gtag = (...args) => {
      calls.push(args);
    };
    updateAnalyticsConsent(true);
    expect(calls).toEqual([['consent', 'update', { analytics_storage: 'granted' }]]);
  });

  it('pushes a denied update on withdrawal', () => {
    const calls: unknown[][] = [];
    (globalThis as GtagGlobals).gtag = (...args) => {
      calls.push(args);
    };
    updateAnalyticsConsent(false);
    expect(calls).toEqual([['consent', 'update', { analytics_storage: 'denied' }]]);
  });

  it('is a no-op when the bootstrap has not run', () => {
    expect(() => updateAnalyticsConsent(true)).not.toThrow();
  });
});

describe('reloadPage', () => {
  it('reloads the target document', () => {
    const reload = vi.fn();
    reloadPage({ reload });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  // Covers the default argument — jsdom cannot navigate and `location` is
  // unforgeable there, so the real target can only be checked for safety.
  it('is safe to call against the real location', () => {
    expect(() => reloadPage()).not.toThrow();
  });
});

describe('deleteGaCookies', () => {
  // Cookies live on the shared jsdom document and tests run shuffled, so a
  // seed left behind would leak into another test's assertion.
  afterEach(() => {
    document.cookie
      .split(';')
      .map((pair) => pair.split('=')[0].trim())
      .filter((name) => name !== '')
      .forEach((name) => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      });
  });

  it('expires _ga and _ga_* cookies but leaves others', () => {
    document.cookie = '_ga=GA1.1.111';
    document.cookie = '_ga_ABC123=GS1.1.222';
    document.cookie = 'other=keep';
    deleteGaCookies();
    expect(document.cookie).toBe('other=keep');
  });

  // `_gaX` is not a GA cookie. The pattern anchors on `_ga` followed by the
  // end of the name or an underscore; drop that anchor for a bare `^_ga` and
  // this cookie — and any other one merely starting those three characters —
  // gets expired along with GA's own, with nothing else here to notice.
  it('leaves a cookie whose name merely begins with _ga', () => {
    document.cookie = '_gaX=keep';
    deleteGaCookies();
    expect(document.cookie).toBe('_gaX=keep');
  });
});
