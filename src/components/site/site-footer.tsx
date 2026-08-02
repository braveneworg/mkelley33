/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Link from 'next/link';

import { siteConfig } from '@/lib/site-config';

interface FooterLink {
  href: string;
  /**
   * A profile this site claims as its own, so the link carries `rel="me"`
   * for Mastodon / IndieAuth verification. A boolean rather than the `rel`
   * string itself: it lets the anchor pick between two spelled-out literals,
   * which is what keeps `react/jsx-no-target-blank` able to verify that
   * `noopener noreferrer` is always present.
   */
  identity: boolean;
  label: string;
}

const externalLinks = (): FooterLink[] => {
  const candidates: { href: null | string; identity: boolean; label: string }[] = [
    {
      href: siteConfig.socials.github,
      identity: true,
      label: 'github',
    },
    {
      href: siteConfig.socials.linkedin,
      identity: true,
      label: 'linkedin',
    },
    {
      href: siteConfig.socials.bluesky,
      identity: true,
      label: 'bluesky',
    },
    {
      href: siteConfig.repoUrl,
      identity: false,
      label: 'source',
    },
  ];
  return candidates.filter((candidate): candidate is FooterLink => candidate.href !== null);
};

export const SiteFooter = () => (
  <footer className="border-edge border-t">
    <div className="text-fg-muted mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-5 pt-6 pb-16 font-mono text-xs">
      <p>
        <span aria-hidden="true">🄯</span> {new Date().getFullYear()} michaux kelley — copyleft,
        share alike
      </p>
      <ul className="ml-auto flex flex-wrap gap-x-4">
        {externalLinks().map((link) => (
          <li key={link.label}>
            {/* Both rel values are written out in full rather than composed
                from a shared constant: the lint rule reads the attribute
                statically, so a computed string would leave it unable to
                confirm "noreferrer" is there. */}
            <a
              className="link-draw hover:text-fg"
              href={link.href}
              rel={link.identity ? 'me noopener noreferrer' : 'noopener noreferrer'}
              target="_blank"
            >
              {link.label}
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </li>
        ))}
        <li>
          <Link className="link-draw hover:text-fg" href="/uses">
            uses
          </Link>
        </li>
        <li>
          <a className="link-draw hover:text-fg" href="/feed.xml">
            rss
          </a>
        </li>
        <li>
          <Link className="link-draw hover:text-fg" href="/privacy">
            privacy
          </Link>
        </li>
      </ul>
    </div>
  </footer>
);
