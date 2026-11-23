/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Link from 'next/link';

/**
 * Shown above the header while the owner is previewing, so that a page
 * showing unpublished work never passes for the live one, and there is
 * always a way back. Not prefetched: leaving the preview is a request to a
 * route that clears a cookie, and fetching it early would end the preview.
 */
export const PreviewBanner = () => (
  <aside
    aria-label="Preview"
    className="border-phosphor bg-surface text-fg border-b px-5 py-2 text-center font-mono text-xs print:hidden"
  >
    previewing unpublished changes —{' '}
    <Link
      className="text-phosphor underline underline-offset-4"
      href="/preview/exit"
      prefetch={false}
    >
      exit preview
    </Link>
  </aside>
);
