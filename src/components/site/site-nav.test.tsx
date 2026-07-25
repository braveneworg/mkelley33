import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { SiteNav } from '@/components/site/site-nav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('SiteNav', () => {
  it('renders the logo linking home', () => {
    render(<SiteNav />);
    expect(screen.getByRole('link', { name: '~/mkelley33' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it.each([
    ['./home', '/'],
    ['./blog', '/blog'],
    ['./services', '/services'],
    ['./cv', '/cv'],
    ['./contact', '/contact'],
  ])('renders %s linking to %s', (label, href) => {
    render(<SiteNav />);
    expect(screen.getByRole('link', { name: label })).toHaveAttribute(
      'href',
      href,
    );
  });

  it('marks the current route with aria-current', () => {
    render(<SiteNav />);
    expect(screen.getByRole('link', { name: './home' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: './blog' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
