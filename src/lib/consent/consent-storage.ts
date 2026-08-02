/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { z } from 'zod';

/**
 * The consent decision persisted in localStorage. Client-editable external
 * input — every read passes through Zod. Bump CONSENT_VERSION on material
 * policy changes: every stored decision becomes undecided and visitors are
 * re-prompted.
 */
export interface ConsentRecord {
  analytics: boolean;
  decidedAt: string;
  version: number;
}

export const CONSENT_STORAGE_KEY = 'mkelley33.consent.v1'; // public storage slot name — gitleaks:allow
export const CONSENT_VERSION = 1;
/** Stored decisions expire after 12 months (CNIL-aligned re-prompt). */
export const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

const consentRecordSchema = z.object({
  analytics: z.boolean(),
  decidedAt: z.string(),
  version: z.number().int(),
});

const safeLocalStorage = (): null | Storage => {
  try {
    // Accessing localStorage itself throws when storage is disabled.
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

/**
 * Reads the stored decision. Missing, corrupt, wrong-version, unparseable,
 * or expired records all read as null (undecided) — never throws, so it is
 * safe in any render path. `now` exists for deterministic tests.
 */
export const readConsent = (now: Date = new Date()): ConsentRecord | null => {
  const storage = safeLocalStorage();
  if (!storage) {
    return null;
  }
  let raw: null | string;
  try {
    raw = storage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) {
    return null;
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = consentRecordSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return null;
  }
  if (parsed.data.version !== CONSENT_VERSION) {
    return null;
  }
  const decidedAtMs = Date.parse(parsed.data.decidedAt);
  if (Number.isNaN(decidedAtMs)) {
    return null;
  }
  if (now.getTime() - decidedAtMs > CONSENT_MAX_AGE_MS) {
    return null;
  }
  return parsed.data;
};

export const writeConsent = (analytics: boolean, now: Date = new Date()): ConsentRecord => {
  const record: ConsentRecord = {
    analytics,
    decidedAt: now.toISOString(),
    version: CONSENT_VERSION,
  };
  try {
    safeLocalStorage()?.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage full or blocked: the decision still applies to this page
    // view; the visitor is simply re-prompted next visit.
  }
  return record;
};

export const hasAnalyticsConsent = (now: Date = new Date()): boolean =>
  readConsent(now)?.analytics === true;
