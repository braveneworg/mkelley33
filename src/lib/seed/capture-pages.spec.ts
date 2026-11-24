/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { capturePage, orNull, toLinkSeed } from '@/lib/seed/capture-pages';
import type { SeedRefs } from '@/lib/seed/seed-text';
import type { Page } from '@/payload-types';

const leftOut: string[] = [];

const refs: SeedRefs = {
  leftOut: (what) => {
    leftOut.push(what);
  },
  pageSlug: (id) => new Map([['id-of-blog', 'blog']]).get(id),
  picture: () => Promise.resolve(null),
};

beforeEach(() => {
  leftOut.length = 0;
});

describe('orNull', () => {
  it('keeps a value the owner typed', () => {
    expect(orNull('typed')).toBe('typed');
  });

  /** The admin stores a cleared field either way; the Seed has one way to say it. */
  it.each([null, undefined, ''])('writes %j as null', (empty) => {
    expect(orNull(empty)).toBeNull();
  });
});

describe('toLinkSeed', () => {
  it('names the Page a link points at by its address', () => {
    expect(toLinkSeed({ label: 'Read the blog', page: 'id-of-blog' }, refs)).toEqual({
      label: 'Read the blog',
      page: 'blog',
      url: null,
    });
  });

  it('names the Page of a link that a read has resolved', () => {
    const page = { id: 'id-of-blog', slug: 'blog' };

    expect(toLinkSeed({ label: 'Read the blog', page }, refs)).toMatchObject({ page: 'blog' });
  });

  it('keeps a link to an address elsewhere', () => {
    expect(toLinkSeed({ label: 'Elsewhere', url: 'https://example.com' }, refs)).toEqual({
      label: 'Elsewhere',
      page: null,
      url: 'https://example.com',
    });
  });

  /** A link left empty is simply not shown, so there is nothing to report. */
  it.each([undefined, null, {}, { label: null, page: 'id-of-blog' }, { label: 'Nowhere' }])(
    'carries nothing for %j',
    (link) => {
      expect(toLinkSeed(link, refs)).toBeNull();
    }
  );

  it('reports nothing for a link the site does not show', () => {
    toLinkSeed({ label: 'Nowhere' }, refs);

    expect(leftOut).toEqual([]);
  });

  it('carries nothing for a link to a Page visitors are not served', () => {
    expect(toLinkSeed({ label: 'Soon', page: 'id-of-a-draft' }, refs)).toBeNull();
  });

  it('reports a link to a Page visitors are not served', () => {
    toLinkSeed({ label: 'Soon', page: 'id-of-a-draft' }, refs);

    expect(leftOut).toEqual(['the link "Soon": its Page is not published']);
  });
});

describe('capturePage', () => {
  const page = (overrides: Partial<Page>): Page => ({
    createdAt: '2026-11-23T00:00:00.000Z',
    id: 'id-of-now',
    slug: 'now',
    title: 'now',
    updatedAt: '2026-11-23T00:00:00.000Z',
    ...overrides,
  });

  it('writes a Page with nothing on it as one with no Blocks', async () => {
    await expect(capturePage(page({ blocks: null }), refs)).resolves.toEqual({
      blocks: [],
      command: null,
      intro: null,
      meta: { description: null, title: null },
      slug: 'now',
      title: 'now',
    });
  });

  /** A database id, or a timestamp, must not reach a file that is public. */
  it('carries nothing of the record but what the Seed names', async () => {
    const captured = await capturePage(
      page({ blocks: [{ blockName: 'a label', blockType: 'postList', id: 'block-id' }] }),
      refs
    );

    expect(captured.blocks).toEqual([{ blockType: 'postList', command: null }]);
  });

  it('writes a role with no points as one with an empty list', async () => {
    const captured = await capturePage(
      page({
        blocks: [
          {
            blockType: 'cvExperience',
            entries: [{ end: 'present', org: 'An Org', role: 'A Role', start: '2021' }],
            heading: 'Experience',
          },
        ],
      }),
      refs
    );

    expect(captured.blocks).toMatchObject([{ entries: [{ bullets: [], location: null }] }]);
  });
});
