/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { linkSeedSchema, pagesLinkedFrom, pagesSeedSchema } from '@/lib/seed/page-seed';
import { link, pageLink, paragraph, richText } from '@/test/lexical';

const meta = { description: null, title: null };

const page = (slug: string, blocks: unknown[] = []) => ({
  blocks,
  command: null,
  intro: null,
  meta,
  slug,
  title: slug,
});

/** The privacy Page cannot be published without these two (docs/adr/0002). */
const GUARDED = [{ blockType: 'cookieInventory' }, { blockType: 'managePreferences' }];

const FIXED = [
  ...['home', 'blog', 'contact', 'services'].map((slug) => page(slug)),
  page('privacy', GUARDED),
];

const accepts = (pages: unknown): boolean => pagesSeedSchema.safeParse(pages).success;

describe('pagesSeedSchema', () => {
  it('accepts the Fixed Pages with nothing on them but what the privacy Page must hold', () => {
    expect(accepts(FIXED)).toBe(true);
  });

  /** A database filled from the Seed has to build, and a build needs each of them. */
  it.each(['home', 'blog', 'contact', 'services', 'privacy'])(
    'rejects a Seed without the %s Page',
    (slug) => {
      expect(accepts(FIXED.filter((fixed) => fixed.slug !== slug))).toBe(false);
    }
  );

  /** The fill would be refused at the publish; the Seed says so before it writes anything. */
  it.each(GUARDED)('rejects a privacy Page without its $blockType Block', (missing) => {
    const others = FIXED.filter(({ slug }) => slug !== 'privacy');
    const blocks = GUARDED.filter((block) => block !== missing);

    expect(accepts([...others, page('privacy', blocks)])).toBe(false);
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

  /** Nothing to type into either (docs/adr/0002), so the Seed carries only the kind. */
  it.each(['cookieInventory', 'managePreferences'])('accepts a %s Block', (blockType) => {
    expect(accepts([...FIXED, page('uses', [{ blockType }])])).toBe(true);
  });

  it.each(['cookieInventory', 'managePreferences'])(
    'rejects a %s Block that carries text of its own',
    (blockType) => {
      expect(accepts([...FIXED, page('uses', [{ blockType, command: 'ls ./cookies' }])])).toBe(
        false
      );
    }
  );

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

/** A line of the CV, as the Seed carries it. */
const line = (words: string) => richText(paragraph(words));

/** The four kinds of CV Block, each holding `text` wherever the owner can type a link. */
const cvBlocks = (text: unknown) => [
  { blockType: 'cvSummary', heading: 'Summary', text },
  { blockType: 'cvSkills', groups: [{ items: text, label: 'Languages' }], heading: 'Skills' },
  {
    blockType: 'cvExperience',
    entries: [
      {
        bullets: [text],
        end: 'present',
        location: null,
        org: text,
        role: 'A Role',
        start: '2021',
      },
    ],
    heading: 'Experience',
  },
  { blockType: 'cvEntries', heading: 'Education', items: [{ detail: text, title: text }] },
];

describe('the text of the CV in the Seed', () => {
  it.each(cvBlocks(line('Ten years.')))('is rich text on a $blockType Block', (block) => {
    expect(accepts([...FIXED, page('cv', [block])])).toBe(true);
  });

  it('may link to an address elsewhere', () => {
    const text = richText(paragraph('Built ', link('https://example.com', 'a project')));

    expect(accepts([...FIXED, page('cv', cvBlocks(text))])).toBe(true);
  });

  /** What these fields held before they took links. */
  it.each(cvBlocks('Ten years.'))('is no longer plain text on a $blockType Block', (block) => {
    expect(accepts([...FIXED, page('cv', [block])])).toBe(false);
  });

  it('may leave the line under an item out', () => {
    const block = {
      blockType: 'cvEntries',
      heading: 'Open source',
      items: [{ detail: null, title: line('A project') }],
    };

    expect(accepts([...FIXED, page('cv', [block])])).toBe(true);
  });

  /** A link names its Page by address, as it does in a Terminal's text. */
  it.each(cvBlocks(richText(paragraph(pageLink('now', 'what I am doing')))))(
    'cannot link to a Page the Seed does not carry from a $blockType Block',
    (block) => {
      expect(accepts([...FIXED, page('cv', [block])])).toBe(false);
    }
  );
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

  it.each(cvBlocks(richText(paragraph(pageLink('blog', 'the blog')))))(
    'lists the Pages the text of a $blockType Block links to',
    (block) => {
      const parsed = pagesSeedSchema.parse([...FIXED, page('cv', [block])]);
      const cv = parsed.find(({ slug }) => slug === 'cv');

      expect(new Set(cv === undefined ? [] : pagesLinkedFrom(cv))).toEqual(new Set(['blog']));
    }
  );
});
