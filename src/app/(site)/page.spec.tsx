/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import HomePage, { generateMetadata } from '@/app/(site)/page';
import { loadPage } from '@/lib/pages/load-page';
import type { Page } from '@/payload-types';

vi.mock('@/lib/pages/load-page', () => ({ loadPage: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

const home = (overrides: Partial<Page> = {}): Page =>
  ({
    _status: 'published',
    blocks: [{ blockType: 'chipList', chips: ['a chip'], command: 'cat ./chips' }],
    id: 'page-home',
    slug: 'home',
    title: 'home',
    ...overrides,
  }) as Page;

beforeEach(() => {
  vi.mocked(loadPage).mockResolvedValue(home());
});

describe('homepage metadata', () => {
  it('pins the canonical to the site root', async () => {
    // The root route's internal pathname is '/index', so the layout's
    // relative './' canonical would resolve to /index here.
    expect((await generateMetadata()).alternates?.canonical).toBe('/');
  });

  it('keeps the RSS feed alternate the layout would otherwise provide', async () => {
    // A page-level `alternates` replaces the layout's object wholesale, so
    // the override must carry the feed alternate too.
    const { alternates } = await generateMetadata();

    expect(alternates?.types?.['application/rss+xml']).toBe('/feed.xml');
  });

  /** "home" is the Page's name in the admin, not a title for a search result. */
  it("leaves the site's own browser title in place", async () => {
    expect(await generateMetadata()).not.toHaveProperty('title');
  });

  it('uses a search title and description when the owner wrote them', async () => {
    vi.mocked(loadPage).mockResolvedValue(
      home({ meta: { description: 'A description.', title: 'A title' } })
    );

    expect(await generateMetadata()).toMatchObject({
      description: 'A description.',
      title: 'A title',
    });
  });
});

describe('the home route', () => {
  it('asks for the home Page', async () => {
    await HomePage();

    expect(loadPage).toHaveBeenCalledWith('home');
  });

  it("renders the home Page's Blocks", async () => {
    render(await HomePage());

    expect(screen.getByRole('heading', { level: 2, name: 'cat ./chips' })).toBeInTheDocument();
  });

  /** Only the owner's preview can get here: for a visitor a missing home Page throws. */
  it('is a 404 when a preview finds no home Page', async () => {
    vi.mocked(loadPage).mockResolvedValue(null);

    await expect(HomePage()).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
