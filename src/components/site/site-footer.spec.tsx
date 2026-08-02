/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { SiteFooter } from '@/components/site/site-footer';
import { siteConfig } from '@/lib/site-config';

describe('SiteFooter', () => {
  it('renders the copyleft line with the current year', () => {
    render(<SiteFooter />);
    const year = new Date().getFullYear().toString();
    // Substring assertion on the footer's text rather than a built regex —
    // the year is interpolated data, and toHaveTextContent takes a plain
    // string.
    expect(screen.getByRole('contentinfo')).toHaveTextContent(`${year} michaux kelley — copyleft`);
  });

  it('renders github and linkedin links', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: /^github/ })).toHaveAttribute(
      'href',
      siteConfig.socials.github
    );
    expect(screen.getByRole('link', { name: /^linkedin/ })).toHaveAttribute(
      'href',
      siteConfig.socials.linkedin
    );
  });

  it('renders the bluesky link', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: /^bluesky/ })).toHaveAttribute(
      'href',
      siteConfig.socials.bluesky
    );
  });

  it('marks external links as safe new-tab links', () => {
    render(<SiteFooter />);
    const github = screen.getByRole('link', { name: /^github/ });
    expect(github).toHaveAttribute('target', '_blank');
    expect(github).toHaveAttribute('rel', 'me noopener noreferrer');
  });

  it('omits rel="me" on links that are not identity profiles', () => {
    render(<SiteFooter />);
    const source = screen.getByRole('link', { name: /^source/ });
    expect(source).toHaveAttribute('target', '_blank');
    expect(source).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('extends every new-tab link name with an opens-in-new-tab note', () => {
    render(<SiteFooter />);
    for (const name of [/^github/, /^linkedin/, /^bluesky/, /^source/]) {
      expect(screen.getByRole('link', { name })).toHaveAccessibleName(/\(opens in new tab\)$/);
    }
  });

  it('hides the copyleft glyph from assistive tech', () => {
    render(<SiteFooter />);
    expect(screen.getByText('🄯')).toHaveAttribute('aria-hidden', 'true');
  });

  it('links the RSS feed internally', () => {
    render(<SiteFooter />);
    const rss = screen.getByRole('link', { name: 'rss' });
    expect(rss).toHaveAttribute('href', '/feed.xml');
    expect(rss).not.toHaveAttribute('target');
  });

  it('links the repo source now that repoUrl is set', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: /^source/ })).toHaveAttribute(
      'href',
      'https://github.com/braveneworg/mkelley33'
    );
  });

  it('links the uses page internally', () => {
    render(<SiteFooter />);
    const uses = screen.getByRole('link', { name: 'uses' });
    expect(uses).toHaveAttribute('href', '/uses');
    expect(uses).not.toHaveAttribute('target');
  });

  it('links to the privacy page', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'privacy' })).toHaveAttribute('href', '/privacy');
  });

  it('reserves bottom padding for the consent cursor trigger', () => {
    const { container } = render(<SiteFooter />);
    expect(container.querySelector('.pb-16')).not.toBeNull();
  });
});
