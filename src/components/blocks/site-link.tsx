/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Link from 'next/link';

import type { ResolvedLink } from '@/lib/pages/links';

/**
 * The arrow after a link that leaves the site. The second character keeps
 * it a text glyph where a phone would otherwise draw an emoji.
 */
const LEAVES_THE_SITE = '\u2197\uFE0E';

/**
 * Keeps the arrow on the line of the word it follows. It does that only
 * together with the `whitespace-nowrap` around it and the arrow: a browser
 * breaks a line before a block of its own whatever character comes first.
 */
const WORD_JOINER = '\u2060';

/**
 * The one way the site renders a link: an address on this site through the
 * router, an address elsewhere in a new tab with the `rel` that keeps the
 * opener safe and a spoken hint that it leaves.
 *
 * With `arrow`, a link that leaves also shows it: an arrow after its words.
 * The arrow is decoration — the spoken hint already says so — and is left
 * off paper, where nothing can be followed.
 */
export const SiteAnchor = ({
  arrow = false,
  children,
  className,
  external,
  href,
}: {
  arrow?: boolean;
  children: React.ReactNode;
  className?: string;
  external: boolean;
  href: string;
}) =>
  external ? (
    <a className={className} href={href} rel="noopener noreferrer" target="_blank">
      {children}
      {arrow ? (
        <span aria-hidden="true" className="whitespace-nowrap">
          {WORD_JOINER}
          {/* A block of its own, so the link's underline stops at the words. */}
          <span className="ml-0.5 inline-block print:hidden">{LEAVES_THE_SITE}</span>
        </span>
      ) : null}
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
