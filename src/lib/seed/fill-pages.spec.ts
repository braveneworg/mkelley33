/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { inFillOrder, toLinkData } from '@/lib/seed/fill-pages';
import type { PageSeed } from '@/lib/seed/page-seed';

const page = (slug: string, ...linksTo: string[]): PageSeed => ({
  blocks: linksTo.map((target) => ({
    blockType: 'timeline' as const,
    command: null,
    entries: [{ marker: null, period: null, title: 'an entry' }],
    link: { label: target, page: target, url: null },
  })),
  command: null,
  intro: null,
  meta: { description: null, title: null },
  slug,
  title: slug,
});

const slugs = (pages: readonly PageSeed[]): string[] => pages.map(({ slug }) => slug);

describe('inFillOrder', () => {
  /** A link is stored as the id of its target, so the target is created first. */
  it('puts a Page after every Page it links to', () => {
    expect(slugs(inFillOrder([page('home', 'blog', 'cv'), page('blog'), page('cv')]))).toEqual([
      'blog',
      'cv',
      'home',
    ]);
  });

  it('follows a chain of links to its end', () => {
    expect(slugs(inFillOrder([page('home', 'blog'), page('blog', 'cv'), page('cv')]))).toEqual([
      'cv',
      'blog',
      'home',
    ]);
  });

  it('keeps the order of the Seed where no link asks for another', () => {
    expect(slugs(inFillOrder([page('uses'), page('cv')]))).toEqual(['uses', 'cv']);
  });

  it('lists a Page once, however many link to it', () => {
    expect(slugs(inFillOrder([page('home', 'blog'), page('cv', 'blog'), page('blog')]))).toEqual([
      'blog',
      'home',
      'cv',
    ]);
  });

  /**
   * Pages that link to each other cannot both come first. Each is still
   * listed once; the fill gives one of them an id to point at beforehand.
   */
  it('lists Pages that link to each other once each', () => {
    expect(slugs(inFillOrder([page('home', 'cv'), page('cv', 'home')]))).toEqual(['cv', 'home']);
  });

  it('lists a Page that links to itself once', () => {
    expect(slugs(inFillOrder([page('now', 'now')]))).toEqual(['now']);
  });
});

describe('toLinkData', () => {
  const pageIds = new Map([['blog', 'id-of-blog']]);

  it('stores a link to a Page as that Page’s id', () => {
    expect(toLinkData({ label: 'blog', page: 'blog', url: null }, pageIds)).toEqual({
      label: 'blog',
      page: 'id-of-blog',
      url: null,
    });
  });

  it('stores a link to an address as it is', () => {
    expect(toLinkData({ label: 'docs', page: null, url: 'https://example.com' }, pageIds)).toEqual({
      label: 'docs',
      page: null,
      url: 'https://example.com',
    });
  });

  /** Storing a link to nowhere would hide a fault in the fill order. */
  it('refuses a link to a Page that does not exist yet', () => {
    expect(() => toLinkData({ label: 'cv', page: 'cv', url: null }, pageIds)).toThrow(
      'the cv Page, which does not exist yet'
    );
  });
});
