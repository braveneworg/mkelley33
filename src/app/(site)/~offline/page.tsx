/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'offline',
};

export default function OfflinePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <p className="text-fg-muted font-mono text-sm">
        <span aria-hidden="true" className="text-phosphor">
          $
        </span>{' '}
        ping mkelley33.com
      </p>
      <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight">
        <span aria-hidden="true"># </span>offline
      </h1>
      <p className="text-fg-muted mt-3 max-w-2xl leading-relaxed">
        no connection — posts you&apos;ve already read are still available from the cache.
        everything else needs a network.
      </p>
    </div>
  );
}
