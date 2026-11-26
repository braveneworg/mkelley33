/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import { useEffect, useId, useRef, useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { OutsideArrow } from '@/components/blocks/site-link';
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
 * One 2px bar of the hamburger. The three sit 5px apart (4, 9, 14px) in a
 * 20px box, so shifting the outer two 5px onto the middle one and turning
 * them ±45° makes the cross while the middle one fades out.
 */
const BAR_CLASSES =
  'absolute left-0 h-0.5 w-6 rounded-full bg-current transition duration-300 ease-out motion-reduce:transition-none';

/**
 * Below `sm` the links fold into a panel that slides open under the header
 * row: the grid row animates from `0fr` to `1fr`. `invisible` takes the
 * closed links out of the tab order and the accessibility tree, and
 * transitioning `visibility` keeps them painted until the slide has
 * finished. From `sm` up the panel is a plain block and always visible.
 */
const MENU_CLASSES =
  'grid w-full transition-[grid-template-rows,visibility] duration-300 ease-out motion-reduce:transition-none sm:ml-auto sm:block sm:w-auto sm:visible';

/**
 * The header. Its links are the header menu from Site settings, already
 * resolved: an item whose Page is unpublished is simply not in the list.
 */
export const SiteNav = ({ links }: { links: readonly ResolvedLink[] }) => {
  const pathname = usePathname();
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const close = (): void => setOpen(false);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKeyDown = ({ key }: KeyboardEvent): void => {
      if (key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    // Sticky with a translucent, blurred canvas: content scrolls behind the
    // header rather than under an opaque bar. The open phone menu goes solid,
    // or the page would show through its links. z-30 keeps it under the
    // consent UI (z-40) and dialogs (z-50).
    <header
      className={`border-edge sticky top-0 z-30 border-b backdrop-blur ${open ? 'bg-canvas sm:bg-canvas/80' : 'bg-canvas/80'}`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 px-5 py-4 font-mono text-sm"
      >
        <Link className="text-phosphor font-bold" href="/">
          ~/mkelley33
        </Link>
        <button
          aria-controls={menuId}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="text-phosphor relative ml-auto h-5 w-6 sm:hidden"
          onClick={() => setOpen((previous) => !previous)}
          ref={buttonRef}
          type="button"
        >
          <span
            aria-hidden="true"
            className={`${BAR_CLASSES} top-1 ${open ? 'translate-y-1.25 rotate-45' : ''}`}
            data-bar="top"
          />
          <span
            aria-hidden="true"
            className={`${BAR_CLASSES} top-2.25 ${open ? 'scale-x-0 opacity-0' : ''}`}
          />
          <span
            aria-hidden="true"
            className={`${BAR_CLASSES} top-3.5 ${open ? '-translate-y-1.25 -rotate-45' : ''}`}
          />
        </button>
        <div
          className={`${MENU_CLASSES} ${open ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]'}`}
          id={menuId}
        >
          <div className="min-h-0 overflow-hidden sm:overflow-visible">
            <ul className="flex flex-col gap-3 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2 sm:pt-0">
              {links.map(({ external, href, label }) => (
                <li key={`${href}-${label}`}>
                  {external ? (
                    <a
                      className={LINK_CLASSES}
                      href={href}
                      onClick={close}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {label}
                      <OutsideArrow />
                      <span className="sr-only"> (opens in new tab)</span>
                    </a>
                  ) : (
                    <Link
                      aria-current={isActive(pathname, href) ? 'page' : undefined}
                      className={LINK_CLASSES}
                      href={href}
                      onClick={close}
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
          </div>
        </div>
      </nav>
    </header>
  );
};
