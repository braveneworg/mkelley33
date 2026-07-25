import { render, screen } from '@testing-library/react';

import { SiteFooter } from '@/components/site/site-footer';
import { siteConfig } from '@/lib/site-config';

describe('SiteFooter', () => {
  it('renders the copyleft line with the current year', () => {
    render(<SiteFooter />);
    const year = new Date().getFullYear().toString();
    expect(
      screen.getByText(new RegExp(`${year} michaux kelley — copyleft`)),
    ).toBeInTheDocument();
  });

  it('renders github and linkedin links', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'github' })).toHaveAttribute(
      'href',
      siteConfig.socials.github,
    );
    expect(screen.getByRole('link', { name: 'linkedin' })).toHaveAttribute(
      'href',
      siteConfig.socials.linkedin,
    );
  });

  it('hides links whose URLs are not yet supplied', () => {
    render(<SiteFooter />);
    expect(
      screen.queryByRole('link', { name: 'bluesky' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'source' }),
    ).not.toBeInTheDocument();
  });
});
