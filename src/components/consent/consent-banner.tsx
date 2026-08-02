/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import Link from 'next/link';

import { useConsent } from '@/components/consent/consent-provider';

const BANNER_BUTTON_CLASSES =
  'border-phosphor text-phosphor hover:bg-phosphor hover:text-canvas rounded border px-3 py-1.5 font-mono text-xs transition-colors';

/**
 * First-visit consent bar. Non-modal by design — EU guidance forbids
 * consent walls, so the page stays fully usable behind it. All three
 * actions get identical visual weight (no dark patterns).
 */
export const ConsentBanner = () => {
  const { denyAll, grantAll, openPreferences, status } = useConsent();

  if (status !== 'undecided') {
    return null;
  }

  return (
    <section
      aria-label="cookie consent"
      className="border-edge bg-surface fixed inset-x-0 bottom-0 z-40 border-t"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-5 py-4">
        <p className="text-fg-muted font-mono text-xs">
          this site uses cookies for analytics — no analytics loads until you decide.{' '}
          <Link className="link-draw text-fg" href="/privacy">
            privacy
          </Link>
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className={BANNER_BUTTON_CLASSES} onClick={grantAll} type="button">
            accept all
          </button>
          <button className={BANNER_BUTTON_CLASSES} onClick={denyAll} type="button">
            decline all
          </button>
          <button className={BANNER_BUTTON_CLASSES} onClick={openPreferences} type="button">
            customize
          </button>
        </div>
      </div>
    </section>
  );
};
