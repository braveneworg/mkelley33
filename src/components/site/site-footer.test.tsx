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
  });

  it('marks external links as safe new-tab links', () => {
    render(<SiteFooter />);
    const github = screen.getByRole('link', { name: 'github' });
    expect(github).toHaveAttribute('target', '_blank');
    expect(github).toHaveAttribute('rel', 'me noopener noreferrer');
  });

  it('links the RSS feed internally', () => {
    render(<SiteFooter />);
    const rss = screen.getByRole('link', { name: 'rss' });
    expect(rss).toHaveAttribute('href', '/feed.xml');
    expect(rss).not.toHaveAttribute('target');
  });

  it('links the repo source now that repoUrl is set', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'source' })).toHaveAttribute(
      'href',
      'https://github.com/braveneworg/mkelley33',
    );
  });

  it('links the uses page internally', () => {
    render(<SiteFooter />);
    const uses = screen.getByRole('link', { name: 'uses' });
    expect(uses).toHaveAttribute('href', '/uses');
    expect(uses).not.toHaveAttribute('target');
  });
});
