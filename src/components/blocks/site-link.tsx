/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Link from 'next/link';

import type { ResolvedLink } from '@/lib/pages/links';

/**
 * A resolved link, rendered the one way the site renders links: a Page on
 * this site through the router, an address elsewhere in a new tab with the
 * `rel` that keeps the opener safe and a spoken hint that it leaves.
 */
export const SiteLink = ({
  className,
  link: { external, href, label },
}: {
  className?: string;
  link: ResolvedLink;
}) =>
  external ? (
    <a className={className} href={href} rel="noopener noreferrer" target="_blank">
      {label}
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  ) : (
    <Link className={className} href={href}>
      {label}
    </Link>
  );
