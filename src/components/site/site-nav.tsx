'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ThemeToggle } from '@/components/site/theme-toggle';

const NAV_LINKS = [
  { href: '/', label: './home' },
  { href: '/blog', label: './blog' },
  { href: '/services', label: './services' },
  { href: '/cv', label: './cv' },
  { href: '/contact', label: './contact' },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-edge">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 font-mono text-sm"
      >
        <Link className="font-bold text-phosphor" href="/">
          ~/mkelley33
        </Link>
        <ul className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                aria-current={isActive(pathname, link.href) ? 'page' : undefined}
                className="text-fg-muted transition-colors hover:text-fg aria-[current=page]:text-fg"
                href={link.href}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li className="hidden sm:block">
            <button
              aria-label="Open command palette"
              className="rounded border border-edge px-1.5 py-0.5 text-xs text-fg-muted transition-colors hover:border-phosphor hover:text-fg"
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
}
