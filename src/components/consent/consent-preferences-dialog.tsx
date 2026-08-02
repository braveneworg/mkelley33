/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import { useEffect, useId, useState } from 'react';

import { useConsent } from '@/components/consent/consent-provider';
import { CookieInventoryTable } from '@/components/consent/cookie-inventory-table';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { CONSENT_CATEGORIES } from '@/lib/consent/inventory';

const ACTION_BUTTON_CLASSES =
  'border-phosphor text-phosphor hover:bg-phosphor hover:text-canvas rounded border px-3 py-1.5 font-mono text-xs transition-colors';

/** The in-depth consent form: per-category toggles + full inventory. */
export const ConsentPreferencesDialog = () => {
  const { analyticsGranted, closePreferences, denyAll, grantAll, preferencesOpen, save } =
    useConsent();
  const [analyticsPending, setAnalyticsPending] = useState(analyticsGranted);
  const descriptionId = useId();

  // Re-sync the pending toggle each time the dialog opens, so an abandoned
  // change never leaks into the next opening.
  useEffect(() => {
    if (preferencesOpen) {
      setAnalyticsPending(analyticsGranted);
    }
  }, [analyticsGranted, preferencesOpen]);

  return (
    <Dialog onOpenChange={(open) => (open ? undefined : closePreferences())} open={preferencesOpen}>
      <DialogContent
        aria-describedby={descriptionId}
        className="max-h-[85dvh] max-w-lg overflow-y-auto"
      >
        <DialogTitle>cookie preferences</DialogTitle>
        <p className="text-fg-muted mt-2 font-mono text-xs" id={descriptionId}>
          essential storage is always on; everything else stays off until you allow it. every cookie
          and storage entry is listed below.
        </p>
        {CONSENT_CATEGORIES.map((category) => (
          <section aria-label={`${category.title} category`} className="mt-5" key={category.id}>
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-mono text-sm font-bold">{category.title}</h3>
              {category.id === 'essential' ? (
                <Switch checked disabled label="always on" onCheckedChange={() => undefined} />
              ) : (
                <Switch
                  checked={analyticsPending}
                  label={analyticsPending ? 'on' : 'off'}
                  onCheckedChange={setAnalyticsPending}
                />
              )}
            </div>
            <p className="text-fg-muted mt-1 font-mono text-xs">{category.description}</p>
            <div className="mt-2">
              <CookieInventoryTable category={category.id} />
            </div>
          </section>
        ))}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            className={ACTION_BUTTON_CLASSES}
            onClick={() => save({ analytics: analyticsPending })}
            type="button"
          >
            save preferences
          </button>
          <button className={ACTION_BUTTON_CLASSES} onClick={grantAll} type="button">
            accept all
          </button>
          <button className={ACTION_BUTTON_CLASSES} onClick={denyAll} type="button">
            decline all
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
