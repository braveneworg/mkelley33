/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { unsubscribeSubscriber } from '@/lib/repositories/subscribers';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'unsubscribe',
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const unsubscribed = token ? await unsubscribeSubscriber(token) : false;
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <p className="text-fg-muted font-mono text-sm">
        <span aria-hidden="true" className="text-phosphor">
          $
        </span>{' '}
        ./unsubscribe
      </p>
      {unsubscribed ? (
        <>
          <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight">
            <span aria-hidden="true"># </span>unsubscribed
          </h1>
          <p className="text-fg-muted mt-3 max-w-2xl leading-relaxed">
            done — no more email from here. resubscribe anytime if you change your mind.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight">
            <span aria-hidden="true"># </span>invalid token
          </h1>
          <p className="text-fg-muted mt-3 max-w-2xl leading-relaxed">
            this unsubscribe link is invalid — reply to any newsletter email and I&apos;ll remove
            you by hand.
          </p>
        </>
      )}
    </div>
  );
}
