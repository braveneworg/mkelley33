/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import sitemap from '@/app/sitemap';
import type { Post } from '@/payload-types';

vi.mock('@/lib/repositories/pages', () => ({
  listPublishedPages: vi.fn(async () => [
    { href: '/', slug: 'home', title: 'home', updatedAt: '2026-11-01T00:00:00.000Z' },
    { href: '/uses', slug: 'uses', title: 'uses', updatedAt: '2026-11-02T00:00:00.000Z' },
  ]),
}));

vi.mock('@/lib/repositories/posts', () => ({
  listPublishedPosts: vi.fn(async () => [
    { slug: 'first-post', updatedAt: '2026-11-03T00:00:00.000Z' } as Post,
  ]),
}));

describe('sitemap', () => {
  it('lists every published Page at its address', async () => {
    expect(await sitemap()).toEqual(
      expect.arrayContaining([
        { lastModified: '2026-11-01T00:00:00.000Z', url: 'https://mkelley33.com' },
        { lastModified: '2026-11-02T00:00:00.000Z', url: 'https://mkelley33.com/uses' },
      ])
    );
  });

  /** Still a route in code, so no Page lists it. */
  it('lists the privacy policy', async () => {
    expect(await sitemap()).toContainEqual({ url: 'https://mkelley33.com/privacy' });
  });

  it('lists every published Post', async () => {
    expect(await sitemap()).toContainEqual({
      lastModified: '2026-11-03T00:00:00.000Z',
      url: 'https://mkelley33.com/blog/first-post',
    });
  });

  it('lists nothing else', async () => {
    expect(await sitemap()).toHaveLength(4);
  });
});
