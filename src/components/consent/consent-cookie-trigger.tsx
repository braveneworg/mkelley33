/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import { useConsent } from '@/components/consent/consent-provider';

/**
 * The always-available way back into cookie preferences: a phosphor-green
 * cookie stuck to the bottom-left of the content column. Sticky rather than
 * fixed — it rides the viewport while there is page left to scroll, then
 * parks at the end of the content instead of floating over the footer, so
 * the wrapper (not the button) is the positioned element and `<main>` is the
 * tall containing block it sticks within.
 *
 * The wrapper spans the full content column to line the cookie up with the
 * page gutter, so it gives pointer events back to the button alone; left
 * clickable it would be a full-width strip swallowing clicks meant for the
 * content beside it.
 *
 * Accepted trade-off: the control is in flow, so once the provider reads
 * storage and the status flips to 'decided', a ~44px box appears at the end
 * of the content. A fixed control avoided that but overlapped the footer,
 * which is the worse of the two.
 *
 * The site's own caret glyph is reserved for terminal branding; this is the
 * one deliberate inline SVG in the codebase (see `src/app/AGENTS.md`), hidden
 * from assistive tech with the meaning carried by the button's `aria-label`.
 */
export const ConsentCookieTrigger = () => {
  const { openPreferences, status } = useConsent();

  if (status !== 'decided') {
    return null;
  }

  return (
    <div className="pointer-events-none sticky bottom-3 z-40 mx-auto w-full max-w-5xl px-5">
      <button
        aria-label="cookie preferences"
        className="group pointer-events-auto flex h-11 w-fit min-w-11 items-center gap-2 rounded px-3"
        onClick={openPreferences}
        type="button"
      >
        {/* One path, `evenodd`: the chips are subpaths inside the disc, so
            they cut out of it rather than needing their own fill. */}
        <svg
          aria-hidden="true"
          className="text-phosphor h-6 w-6 shrink-0 fill-current"
          viewBox="0 0 24 24"
        >
          {/* Chips are scattered and unevenly sized on purpose — a symmetric
              grid reads as a shirt button at this size, not a cookie. */}
          <path
            d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20ZM6.6 8.6a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 1 0-3.2 0Zm7.1-.8a1.1 1.1 0 1 0 2.2 0 1.1 1.1 0 1 0-2.2 0Zm1.1 5.8a1.4 1.4 0 1 0 2.8 0 1.4 1.4 0 1 0-2.8 0Zm-6.6 1.8a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 1 0-2.4 0Zm3.2-3.8a1 1 0 1 0 2 0 1 1 0 1 0-2 0Zm.9 5.6a.9.9 0 1 0 1.8 0 .9.9 0 1 0-1.8 0Z"
            fillRule="evenodd"
          />
        </svg>
        {/* Collapsed to zero width, not merely transparent: a faded label still
            holds its box, and that box is inside the button — an invisible strip
            of clickable page beside the cookie. */}
        <span className="text-phosphor max-w-0 overflow-hidden font-mono text-xs whitespace-nowrap opacity-0 transition-all group-hover:max-w-24 group-hover:opacity-100 group-focus-visible:max-w-24 group-focus-visible:opacity-100">
          cookies
        </span>
      </button>
    </div>
  );
};
