/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Link from 'next/link';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'command not found' };

export default function NotFound() {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-20 font-mono sm:py-28">
      <p className="text-fg-muted text-sm">
        <span aria-hidden="true" className="text-phosphor">
          $
        </span>{' '}
        open requested-page
      </p>
      <h1 className="mt-4 text-2xl font-bold">
        zsh: command not found <span className="text-phosphor">(404)</span>
      </h1>
      <p className="text-fg-muted mt-3 max-w-xl text-sm leading-relaxed">
        The page you were looking for doesn&apos;t exist — it may have been moved, renamed, or never
        committed.
      </p>
      <p className="mt-8 text-sm">
        <Link className="text-phosphor underline underline-offset-4" href="/">
          cd ~
        </Link>
      </p>
    </section>
  );
}
