/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
  CONSENT_MAX_AGE_MS,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  hasAnalyticsConsent,
  readConsent,
  writeConsent,
} from '@/lib/consent/consent-storage';

describe('consent storage', () => {
  afterEach(() => {
    // Restore first: the storage-failure tests leave `localStorage` itself
    // stubbed away, so clearing before restoring throws.
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('round-trips a granted decision', () => {
    writeConsent(true);
    expect(readConsent()?.analytics).toBe(true);
  });

  it('reads as undecided when nothing is stored', () => {
    expect(readConsent()).toBeNull();
  });

  it('reads as undecided when the stored value is corrupt JSON', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, '{not json');
    expect(readConsent()).toBeNull();
  });

  it('reads as undecided when the record fails schema validation', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ analytics: 'yes' }));
    expect(readConsent()).toBeNull();
  });

  it('reads as undecided when the stored version is outdated', () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        analytics: true,
        decidedAt: new Date().toISOString(),
        version: CONSENT_VERSION - 1,
      })
    );
    expect(readConsent()).toBeNull();
  });

  it('reads as undecided when decidedAt is not a parseable date', () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ analytics: true, decidedAt: 'yesterday-ish', version: CONSENT_VERSION })
    );
    expect(readConsent()).toBeNull();
  });

  it('expires records older than twelve months', () => {
    const decidedAt = new Date('2025-01-01T00:00:00.000Z');
    writeConsent(true, decidedAt);
    const justPastExpiry = new Date(decidedAt.getTime() + CONSENT_MAX_AGE_MS + 1);
    expect(readConsent(justPastExpiry)).toBeNull();
  });

  it('honors records within the twelve-month window', () => {
    const decidedAt = new Date('2025-01-01T00:00:00.000Z');
    writeConsent(false, decidedAt);
    const wellBeforeExpiry = new Date(decidedAt.getTime() + 1000);
    expect(readConsent(wellBeforeExpiry)?.analytics).toBe(false);
  });

  it('hasAnalyticsConsent is true for a granted, valid record', () => {
    writeConsent(true);
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it('hasAnalyticsConsent is false for a declined record', () => {
    writeConsent(false);
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('hasAnalyticsConsent is false when undecided', () => {
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('reads as undecided where there is no localStorage at all', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(readConsent()).toBeNull();
  });

  it('reads as undecided when touching localStorage throws', () => {
    vi.spyOn(globalThis, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    expect(readConsent()).toBeNull();
  });

  it('reads as undecided when reading the slot throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage read denied');
    });
    expect(readConsent()).toBeNull();
  });

  it('returns the decision even when persisting it throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(writeConsent(true).analytics).toBe(true);
  });
});
