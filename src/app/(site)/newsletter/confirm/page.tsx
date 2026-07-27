/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { confirmSubscriber } from '@/lib/repositories/subscribers';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'confirm subscription',
};

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const confirmed = token ? await confirmSubscriber(token) : false;
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <p className="text-fg-muted font-mono text-sm">
        <span aria-hidden="true" className="text-phosphor">
          $
        </span>{' '}
        ./confirm-subscription
      </p>
      {confirmed ? (
        <>
          <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight">
            <span aria-hidden="true"># </span>subscribed ✓
          </h1>
          <p className="text-fg-muted mt-3 max-w-2xl leading-relaxed">
            you&apos;re in — new posts land in your inbox. unsubscribe anytime from any email.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight">
            <span aria-hidden="true"># </span>invalid token
          </h1>
          <p className="text-fg-muted mt-3 max-w-2xl leading-relaxed">
            this confirmation link is invalid or was replaced by a newer one — subscribe again to
            get a fresh link.
          </p>
        </>
      )}
    </div>
  );
}
