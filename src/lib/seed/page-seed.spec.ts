/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { linkSeedSchema, pagesLinkedFrom, pagesSeedSchema } from '@/lib/seed/page-seed';

const meta = { description: null, title: null };

const page = (slug: string, blocks: unknown[] = []) => ({
  blocks,
  command: null,
  intro: null,
  meta,
  slug,
  title: slug,
});

const FIXED = ['home', 'blog', 'contact', 'services'].map((slug) => page(slug));

const accepts = (pages: unknown): boolean => pagesSeedSchema.safeParse(pages).success;

describe('pagesSeedSchema', () => {
  it('accepts the Fixed Pages with no Blocks', () => {
    expect(accepts(FIXED)).toBe(true);
  });

  /** A database filled from the Seed has to build, and a build needs each of them. */
  it.each(['home', 'blog', 'contact', 'services'])('rejects a Seed without the %s Page', (slug) => {
    expect(accepts(FIXED.filter((fixed) => fixed.slug !== slug))).toBe(false);
  });

  it('rejects two Pages at one address', () => {
    expect(accepts([...FIXED, page('uses'), page('uses')])).toBe(false);
  });

  it('rejects an address the site itself already serves', () => {
    expect(accepts([...FIXED, page('admin')])).toBe(false);
  });

  it('rejects a kind of Block it does not know', () => {
    expect(accepts([...FIXED, page('uses', [{ blockType: 'carousel' }])])).toBe(false);
  });

  it('rejects a key it does not know on a Block', () => {
    const block = { blockType: 'postList', command: null, colour: 'green' };

    expect(accepts([...FIXED, page('uses', [block])])).toBe(false);
  });

  it('rejects a link to a Page the Seed does not carry', () => {
    const block = {
      blockType: 'timeline',
      command: null,
      entries: [{ marker: null, period: null, title: 'an entry' }],
      link: { label: 'now', page: 'now', url: null },
    };

    expect(accepts([...FIXED, page('uses', [block])])).toBe(false);
  });

  /** The Seed uploads this file, so it may only name one inside `seed/files`. */
  it.each(['../secrets.png', '/etc/passwd', 'files/../x.png', 'files/notes.txt', 'headshot.webp'])(
    'rejects a picture path of %s',
    (file) => {
      const block = { blockType: 'picture', caption: null, media: { alt: 'alt text', file } };

      expect(accepts([...FIXED, page('uses', [block])])).toBe(false);
    }
  );

  it('accepts a picture inside the Seed files directory', () => {
    const block = {
      blockType: 'picture',
      caption: null,
      media: { alt: 'alt text', file: 'files/desk.webp' },
    };

    expect(accepts([...FIXED, page('uses', [block])])).toBe(true);
  });

  /** Alt text is required in the Media library; the Seed may not skip it. */
  it('rejects a picture without alt text', () => {
    const block = {
      blockType: 'picture',
      caption: null,
      media: { alt: '', file: 'files/desk.webp' },
    };

    expect(accepts([...FIXED, page('uses', [block])])).toBe(false);
  });
});

describe('linkSeedSchema', () => {
  it('accepts a link to a Page', () => {
    expect(linkSeedSchema.safeParse({ label: 'blog', page: 'blog', url: null }).success).toBe(true);
  });

  it('accepts a link to a full https address', () => {
    const link = { label: 'docs', page: null, url: 'https://example.com' };

    expect(linkSeedSchema.safeParse(link).success).toBe(true);
  });

  it('rejects an address that is not https', () => {
    const link = { label: 'docs', page: null, url: 'http://example.com' };

    expect(linkSeedSchema.safeParse(link).success).toBe(false);
  });
});

describe('pagesLinkedFrom', () => {
  it('lists the Pages a Hero and a Timeline link to', () => {
    const parsed = pagesSeedSchema.parse([
      ...FIXED.filter(({ slug }) => slug !== 'home'),
      page('home', [
        {
          blockType: 'hero',
          command: null,
          primaryAction: { label: 'blog', page: 'blog', url: null },
          secondaryAction: { label: 'docs', page: null, url: 'https://example.com' },
          summary: null,
        },
        {
          blockType: 'timeline',
          command: null,
          entries: [{ marker: null, period: null, title: 'an entry' }],
          link: { label: 'contact', page: 'contact', url: null },
        },
        { blockType: 'postList', command: null },
      ]),
    ]);
    const home = parsed.find(({ slug }) => slug === 'home');

    expect(home === undefined ? [] : pagesLinkedFrom(home)).toEqual(['blog', 'contact']);
  });
});
