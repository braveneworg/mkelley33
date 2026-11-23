/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { loadPage, pageMetadata } from '@/lib/pages/load-page';
import { getFixedPage, getPage, getPageDraft } from '@/lib/repositories/pages';
import type { Page } from '@/payload-types';

const draftMode = vi.fn();

vi.mock('next/headers', () => ({ draftMode: () => draftMode() }));
vi.mock('@/lib/repositories/pages', () => ({
  getFixedPage: vi.fn(),
  getPage: vi.fn(),
  getPageDraft: vi.fn(),
}));

const page = (overrides: Partial<Page> = {}): Page =>
  ({ _status: 'published', id: 'page-1', slug: 'uses', title: 'uses', ...overrides }) as Page;

beforeEach(() => {
  draftMode.mockResolvedValue({ isEnabled: false });
  vi.mocked(getPage).mockReset();
  vi.mocked(getFixedPage).mockReset();
  vi.mocked(getPageDraft).mockReset();
});

describe('loadPage', () => {
  it('gives a visitor the published Page', async () => {
    vi.mocked(getPage).mockResolvedValue(page());

    await expect(loadPage('uses')).resolves.toEqual(page());
  });

  it('gives a visitor nothing where no Page is published', async () => {
    vi.mocked(getPage).mockResolvedValue(null);

    await expect(loadPage('uses')).resolves.toBeNull();
  });

  /** A missing Fixed Page must fail the build, not render a 404 (docs/adr/0001). */
  it('insists on a Fixed Page', async () => {
    vi.mocked(getFixedPage).mockRejectedValue(new Error('The blog Page is not published'));

    await expect(loadPage('blog')).rejects.toThrow('The blog Page is not published');
  });

  it('never shows a visitor a draft', async () => {
    vi.mocked(getPage).mockResolvedValue(page());

    await loadPage('uses');

    expect(getPageDraft).not.toHaveBeenCalled();
  });

  it('gives the owner the newest draft while previewing', async () => {
    draftMode.mockResolvedValue({ isEnabled: true });
    vi.mocked(getPageDraft).mockResolvedValue(page({ title: 'a draft title' }));

    await expect(loadPage('uses')).resolves.toMatchObject({ title: 'a draft title' });
  });

  /** A Fixed Page the owner is still drafting has nothing published to insist on. */
  it('previews a Fixed Page from its draft too', async () => {
    draftMode.mockResolvedValue({ isEnabled: true });
    vi.mocked(getPageDraft).mockResolvedValue(page({ slug: 'blog' }));

    await loadPage('blog');

    expect(getFixedPage).not.toHaveBeenCalled();
  });
});

describe('pageMetadata', () => {
  it('uses the search title and description the owner wrote', () => {
    expect(
      pageMetadata(page({ meta: { description: 'What I use.', title: 'uses & gear' } }))
    ).toEqual({ description: 'What I use.', title: 'uses & gear' });
  });

  it('falls back to the Page title when there is no search title', () => {
    expect(pageMetadata(page({ meta: { description: null, title: null } }))).toEqual({
      title: 'uses',
    });
  });

  it('falls back to the Page title when the search fields were never filled in', () => {
    expect(pageMetadata(page())).toEqual({ title: 'uses' });
  });
});
