/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import PageRoute, { generateMetadata, generateStaticParams } from '@/app/(site)/[slug]/page';
import type * as loadPageModule from '@/lib/pages/load-page';
import { loadPage } from '@/lib/pages/load-page';
import { listPublishedPages } from '@/lib/repositories/pages';
import type { Page } from '@/payload-types';

vi.mock('@/lib/pages/load-page', async (importOriginal) => ({
  ...(await importOriginal<typeof loadPageModule>()),
  loadPage: vi.fn(),
}));
vi.mock('@/lib/repositories/pages', () => ({ listPublishedPages: vi.fn() }));
vi.mock('next/headers', () => ({ draftMode: async () => ({ isEnabled: false }) }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

const uses: Page = {
  _status: 'published',
  blocks: [],
  createdAt: '',
  id: 'page-uses',
  meta: { description: 'What I use.', title: 'uses & gear' },
  slug: 'uses',
  title: 'uses',
  updatedAt: '',
};

const at = (slug: string) => ({ params: Promise.resolve({ slug }) });

beforeEach(() => {
  vi.mocked(loadPage).mockReset();
});

describe('the Page route', () => {
  it('renders the Page at that address', async () => {
    vi.mocked(loadPage).mockResolvedValue(uses);

    render(await PageRoute(at('uses')));

    expect(screen.getByRole('heading', { level: 1, name: 'uses' })).toBeInTheDocument();
  });

  it('is a 404 where no Page is published', async () => {
    vi.mocked(loadPage).mockResolvedValue(null);

    await expect(PageRoute(at('nothing-here'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  /** The home Page is served at the root, and must not have a second address. */
  it('is a 404 at /home', async () => {
    await expect(PageRoute(at('home'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(loadPage).not.toHaveBeenCalled();
  });
});

describe('the Page route metadata', () => {
  it("is the Page's search title and description", async () => {
    vi.mocked(loadPage).mockResolvedValue(uses);

    await expect(generateMetadata(at('uses'))).resolves.toEqual({
      description: 'What I use.',
      title: 'uses & gear',
    });
  });

  it('is empty for an address with no Page, leaving the 404 its own', async () => {
    vi.mocked(loadPage).mockResolvedValue(null);

    await expect(generateMetadata(at('nothing-here'))).resolves.toEqual({});
  });
});

describe('the Pages built ahead of time', () => {
  it('are every published Page except home, which has a route of its own', async () => {
    vi.mocked(listPublishedPages).mockResolvedValue([
      { href: '/', slug: 'home', title: 'home', updatedAt: '' },
      { href: '/uses', slug: 'uses', title: 'uses', updatedAt: '' },
    ]);

    await expect(generateStaticParams()).resolves.toEqual([{ slug: 'uses' }]);
  });
});
