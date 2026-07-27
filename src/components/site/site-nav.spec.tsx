/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { SiteNav } from '@/components/site/site-nav';

const pathnameHolder = { current: '/' };

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameHolder.current,
}));

describe('SiteNav', () => {
  beforeEach(() => {
    pathnameHolder.current = '/';
  });

  it('renders the logo linking home', () => {
    render(<SiteNav />);
    expect(screen.getByRole('link', { name: '~/mkelley33' })).toHaveAttribute('href', '/');
  });

  it.each([
    ['./home', '/'],
    ['./blog', '/blog'],
    ['./services', '/services'],
    ['./cv', '/cv'],
    ['./contact', '/contact'],
  ])('renders %s linking to %s', (label, href) => {
    render(<SiteNav />);
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
  });

  it('marks the current route with aria-current', () => {
    render(<SiteNav />);
    expect(screen.getByRole('link', { name: './home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: './blog' })).not.toHaveAttribute('aria-current');
  });

  it('marks ./blog current on nested post routes', () => {
    pathnameHolder.current = '/blog/create-a-nextjs-blog';
    render(<SiteNav />);
    expect(screen.getByRole('link', { name: './blog' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: './home' })).not.toHaveAttribute('aria-current');
  });
});
