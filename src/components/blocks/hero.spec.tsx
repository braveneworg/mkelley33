/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { Hero } from '@/components/blocks/hero';
import type { HeroBlock, Page } from '@/payload-types';

vi.mock('@/lib/repositories/site-settings', () => ({
  getSiteSettings: vi.fn(async () => ({ name: 'Owner Name', tagline: 'a site tagline' })),
}));

const published = (slug: string): Page =>
  ({ _status: 'published', id: slug, slug, title: slug }) as Page;

const block = (overrides: Partial<HeroBlock> = {}): HeroBlock => ({
  blockType: 'hero',
  command: 'whoami',
  primaryAction: { label: 'Read the blog →', page: published('blog') },
  secondaryAction: { label: 'Work with me', page: published('contact') },
  summary: 'ten years of shipping',
  ...overrides,
});

describe('Hero', () => {
  it("makes the owner's name the main heading when it opens the Page", async () => {
    render(await Hero({ block: block(), isPageHeading: true }));

    expect(screen.getByRole('heading', { level: 1, name: 'Owner Name' })).toBeInTheDocument();
  });

  it('uses an ordinary heading anywhere else, so a Page has one main heading', async () => {
    render(await Hero({ block: block(), isPageHeading: false }));

    expect(screen.getByRole('heading', { level: 2, name: 'Owner Name' })).toBeInTheDocument();
  });

  it('shows the tagline from Site settings and the summary typed into the Block', async () => {
    render(await Hero({ block: block(), isPageHeading: true }));

    expect(screen.getByText('a site tagline')).toBeInTheDocument();
    expect(screen.getByText('ten years of shipping')).toBeInTheDocument();
  });

  it('shows the command line the owner typed', async () => {
    render(await Hero({ block: block({ command: 'id' }), isPageHeading: true }));

    expect(screen.getByText('$ id')).toBeInTheDocument();
  });

  it('links both buttons to the Pages they point at', async () => {
    render(await Hero({ block: block(), isPageHeading: true }));

    expect(screen.getByRole('link', { name: 'Read the blog →' })).toHaveAttribute('href', '/blog');
    expect(screen.getByRole('link', { name: 'Work with me' })).toHaveAttribute('href', '/contact');
  });

  it('leaves out a button that points nowhere', async () => {
    render(
      await Hero({
        block: block({ primaryAction: {}, secondaryAction: {} }),
        isPageHeading: true,
      })
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
