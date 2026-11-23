/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { SiteNav } from '@/components/site/site-nav';

const pathnameHolder = { current: '/' };

/** The header menu as `getSiteSettings` hands it over: resolved, hidden items gone. */
const LINKS = [
  { external: false, href: '/', label: './home' },
  { external: false, href: '/blog', label: './blog' },
  { external: false, href: '/services', label: './services' },
  { external: false, href: '/cv', label: './cv' },
  { external: false, href: '/contact', label: './contact' },
];

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameHolder.current,
}));

describe('SiteNav', () => {
  beforeEach(() => {
    pathnameHolder.current = '/';
  });

  it('renders the logo linking home', () => {
    render(<SiteNav links={LINKS} />);
    expect(screen.getByRole('link', { name: '~/mkelley33' })).toHaveAttribute('href', '/');
  });

  it.each([
    ['./home', '/'],
    ['./blog', '/blog'],
    ['./services', '/services'],
    ['./cv', '/cv'],
    ['./contact', '/contact'],
  ])('renders %s linking to %s', (label, href) => {
    render(<SiteNav links={LINKS} />);
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
  });

  it('marks the current route with aria-current', () => {
    render(<SiteNav links={LINKS} />);
    expect(screen.getByRole('link', { name: './home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: './blog' })).not.toHaveAttribute('aria-current');
  });

  it('marks ./blog current on nested post routes', () => {
    pathnameHolder.current = '/blog/create-a-nextjs-blog';
    render(<SiteNav links={LINKS} />);
    expect(screen.getByRole('link', { name: './blog' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: './home' })).not.toHaveAttribute('aria-current');
  });

  /** The menu is the owner's: the header shows what it is given, in that order. */
  it('renders the links it is given and no others', () => {
    render(<SiteNav links={[{ external: false, href: '/uses', label: './uses' }]} />);

    expect(screen.getByRole('link', { name: './uses' })).toHaveAttribute('href', '/uses');
    expect(screen.queryByRole('link', { name: './blog' })).not.toBeInTheDocument();
  });

  it('opens an outside address in a new tab', () => {
    render(<SiteNav links={[{ external: true, href: 'https://example.com', label: 'docs' }]} />);

    const link = screen.getByRole('link', { name: /^docs/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAccessibleName(/\(opens in new tab\)$/);
  });
});
