/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Link from 'next/link';

import type { ResolvedLink } from '@/lib/pages/links';

/**
 * The one way the site renders a link: an address on this site through the
 * router, an address elsewhere in a new tab with the `rel` that keeps the
 * opener safe and a spoken hint that it leaves.
 */
export const SiteAnchor = ({
  children,
  className,
  external,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  external: boolean;
  href: string;
}) =>
  external ? (
    <a className={className} href={href} rel="noopener noreferrer" target="_blank">
      {children}
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  ) : (
    <Link className={className} href={href}>
      {children}
    </Link>
  );

/** A resolved link — a menu item, a Block's button — under its label. */
export const SiteLink = ({
  className,
  link: { external, href, label },
}: {
  className?: string;
  link: ResolvedLink;
}) => (
  <SiteAnchor className={className} external={external} href={href}>
    {label}
  </SiteAnchor>
);
