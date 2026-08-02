/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import { useConsent } from '@/components/consent/consent-provider';

/**
 * The always-available way back into cookie preferences: a steady phosphor
 * block — the site's typewriter caret, minus the blink — pinned to the
 * bottom-left corner on every viewport. Visually caret-sized; the button
 * itself keeps a 44px hit area for touch and WCAG target size.
 */
export const ConsentCursorTrigger = () => {
  const { openPreferences, status } = useConsent();

  if (status !== 'decided') {
    return null;
  }

  return (
    <button
      aria-label="cookie preferences"
      className="group fixed bottom-3 left-3 z-40 flex h-11 min-w-11 items-center gap-2 rounded px-3"
      onClick={openPreferences}
      type="button"
    >
      <span aria-hidden="true" className="bg-phosphor h-5 w-2.5" />
      {/* Collapsed to zero width, not merely transparent: a faded label still
          holds its box, and that box is inside the button — an invisible strip
          of clickable page beside the caret. */}
      <span className="text-phosphor max-w-0 overflow-hidden font-mono text-xs whitespace-nowrap opacity-0 transition-all group-hover:max-w-24 group-hover:opacity-100 group-focus-visible:max-w-24 group-focus-visible:opacity-100">
        cookies
      </span>
    </button>
  );
};
