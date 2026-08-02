/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { readConsent, writeConsent } from '@/lib/consent/consent-storage';
import { deleteGaCookies, reloadPage, updateAnalyticsConsent } from '@/lib/consent/gtag';

export type ConsentStatus = 'decided' | 'loading' | 'undecided';

export interface ConsentChoices {
  analytics: boolean;
}

export interface ConsentContextValue {
  analyticsGranted: boolean;
  closePreferences: () => void;
  denyAll: () => void;
  grantAll: () => void;
  openPreferences: () => void;
  preferencesOpen: boolean;
  save: (choices: ConsentChoices) => void;
  status: ConsentStatus;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export const useConsent = (): ConsentContextValue => {
  const value = useContext(ConsentContext);
  if (!value) {
    throw new Error('useConsent must be used inside <ConsentProvider>');
  }
  return value;
};

export const ConsentProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<ConsentStatus>('loading');
  const [analyticsGranted, setAnalyticsGranted] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Hydrate from storage after mount: the server render cannot know the
  // decision, and 'loading' keeps banner and trigger unrendered until the
  // stored state has been read — no flash for decided visitors.
  useEffect(() => {
    const record = readConsent();
    if (record === null) {
      setStatus('undecided');
      return;
    }
    if (record.analytics) {
      // Seed the granted signal before the GA tag mounts in the same
      // commit — dataLayer order decides what gtag.js sees at boot.
      updateAnalyticsConsent(true);
    }
    setAnalyticsGranted(record.analytics);
    setStatus('decided');
  }, []);

  const apply = useCallback(
    (analytics: boolean) => {
      // Withdrawal only: a decline from a visitor who never granted has no
      // loaded script to stop, so reloading would cost them their place to
      // undo nothing.
      const withdrawing = analyticsGranted && !analytics;
      updateAnalyticsConsent(analytics);
      if (!analytics) {
        deleteGaCookies();
      }
      writeConsent(analytics);
      setAnalyticsGranted(analytics);
      setStatus('decided');
      setPreferencesOpen(false);
      if (withdrawing) {
        // Neither gtag.js nor Vercel's runtime can be unloaded once mounted,
        // and a denied Consent Mode signal only stops storage — not the
        // beacons. Reloading is the only way to make withdrawal immediate.
        reloadPage();
      }
    },
    [analyticsGranted]
  );

  const value = useMemo<ConsentContextValue>(
    () => ({
      analyticsGranted,
      closePreferences: () => setPreferencesOpen(false),
      denyAll: () => apply(false),
      grantAll: () => apply(true),
      openPreferences: () => setPreferencesOpen(true),
      preferencesOpen,
      save: ({ analytics }) => apply(analytics),
      status,
    }),
    [analyticsGranted, apply, preferencesOpen, status]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
};
