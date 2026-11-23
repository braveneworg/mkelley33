/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ThemeToggle } from '@/components/site/theme-toggle';
import type { ResolvedLink } from '@/lib/pages/links';

const isActive = (pathname: string, href: string): boolean => {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};

const LINK_CLASSES = 'link-draw text-fg-muted hover:text-fg aria-[current=page]:text-fg';

/**
 * The header. Its links are the header menu from Site settings, already
 * resolved: an item whose Page is unpublished is simply not in the list.
 */
export const SiteNav = ({ links }: { links: readonly ResolvedLink[] }) => {
  const pathname = usePathname();

  return (
    <header className="border-edge border-b">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 font-mono text-sm"
      >
        <Link className="text-phosphor font-bold" href="/">
          ~/mkelley33
        </Link>
        <ul className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          {links.map(({ external, href, label }) => (
            <li key={`${href}-${label}`}>
              {external ? (
                <a className={LINK_CLASSES} href={href} rel="noopener noreferrer" target="_blank">
                  {label}
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              ) : (
                <Link
                  aria-current={isActive(pathname, href) ? 'page' : undefined}
                  className={LINK_CLASSES}
                  href={href}
                >
                  {label}
                </Link>
              )}
            </li>
          ))}
          <li className="hidden sm:block">
            <button
              aria-label="Open command palette"
              className="border-edge text-fg-muted hover:border-phosphor hover:text-fg rounded border px-1.5 py-0.5 text-xs transition-colors"
              onClick={() => window.dispatchEvent(new Event('palette:open'))}
              type="button"
            >
              ⌘K
            </button>
          </li>
          <li>
            <ThemeToggle />
          </li>
        </ul>
      </nav>
    </header>
  );
};
