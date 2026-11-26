/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Link from 'next/link';

import { OutsideArrow } from '@/components/blocks/site-link';
import { listSocialLinks, type SiteSettingsContent } from '@/lib/site-settings-content';

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

/**
 * The owner's profiles, then the repository when the owner has set one. The
 * footer adds these, the RSS feed and the privacy link by itself; the footer
 * menu in Site settings supplies whatever else the owner wants here.
 */
const externalLinks = ({ repoUrl, socials }: SiteSettingsContent): FooterLink[] => [
  ...listSocialLinks(socials).map(({ label, url }) => ({ href: url, identity: true, label })),
  ...(repoUrl === null ? [] : [{ href: repoUrl, identity: false, label: 'source' }]),
];

export const SiteFooter = ({ settings }: { settings: SiteSettingsContent }) => (
  <footer className="border-edge border-t">
    <div className="text-fg-muted mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-6 font-mono text-xs">
      <p>
        <span aria-hidden="true">🄯</span> {new Date().getFullYear()} michaux kelley — copyleft,
        share alike
      </p>
      <ul className="ml-auto flex flex-wrap gap-x-4">
        {externalLinks(settings).map((link) => (
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
              <OutsideArrow />
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </li>
        ))}
        {settings.footerMenu.map(({ external, href, label }) => (
          <li key={`${href}-${label}`}>
            {external ? (
              <a
                className="link-draw hover:text-fg"
                href={href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {label}
                <OutsideArrow />
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            ) : (
              <Link className="link-draw hover:text-fg" href={href}>
                {label}
              </Link>
            )}
          </li>
        ))}
        <li>
          <a className="link-draw hover:text-fg" href="/feed.xml">
            rss
          </a>
        </li>
        {/* Not a menu item, so editing the menu can never remove the way to
            the privacy policy (owner's decision, 2026-11-23). */}
        <li>
          <Link className="link-draw hover:text-fg" href="/privacy">
            privacy
          </Link>
        </li>
      </ul>
    </div>
  </footer>
);
