/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { findPublishedPage } from '@/collections/published-page';
import { findPublishedSiteSettings } from '@/globals/published-site-settings';
import { pageLabel } from '@/lib/seed/fill-pages';
import { fillSeed } from '@/lib/seed/fill-seed';
import { loadSeed } from '@/lib/seed/seed-files';
import type { Seed } from '@/lib/seed/seed-files';
import { docLink, paragraph as words, richText } from '@/test/lexical';
import { createTestPayload } from '@/test/payload-harness';

import type { MongooseAdapter } from '@payloadcms/db-mongodb';
import type { Payload } from 'payload';

let payload: Payload;
let reset: () => Promise<void>;
let teardown: () => Promise<void>;

const paragraph = (text: string) => ({
  root: {
    children: [
      {
        children: [
          { detail: 0, format: 0, mode: 'normal', style: '', text, type: 'text', version: 1 },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    type: 'root',
    version: 1,
  },
});

const noMeta = { description: null, title: null };

/** Home links to the blog, and is listed first: the fill has to create the blog before it. */
const pages: Seed['pages'] = [
  {
    blocks: [
      {
        blockType: 'hero',
        command: 'whoami',
        primaryAction: { label: 'Read the blog', page: 'blog', url: null },
        secondaryAction: null,
        summary: 'seed summary',
      },
      {
        blockType: 'terminal',
        body: paragraph('seed about text'),
        command: 'cat ./about.md',
        picture: { alt: 'seed alt text', file: 'files/headshot.webp' },
        pictureStyle: 'roundPortrait',
      },
      {
        blockType: 'cvExperience',
        entries: [
          {
            bullets: ['first point', 'second point'],
            end: 'present',
            location: null,
            org: 'Seed Org',
            role: 'Seed Role',
            start: '2021',
          },
        ],
        heading: 'Experience',
      },
    ],
    command: null,
    intro: null,
    meta: noMeta,
    slug: 'home',
    title: 'home',
  },
  {
    blocks: [{ blockType: 'postList', command: null }],
    command: 'ls ./blog',
    intro: null,
    meta: noMeta,
    slug: 'blog',
    title: 'blog',
  },
];

const seed: Seed = {
  // The committed Seed's own directory, for the real files a fill uploads.
  directory: 'seed',
  pages,
  posts: [],
  services: [
    {
      credibility: 'first credibility',
      deliverables: ['one', 'two'],
      name: 'First',
      pitch: 'first pitch',
      slug: 'first',
    },
    {
      credibility: 'second credibility',
      deliverables: ['three'],
      name: 'Second',
      pitch: 'second pitch',
      slug: 'second',
    },
  ],
  siteSettings: {
    description: 'seed description',
    footerMenu: [{ label: 'elsewhere', page: null, url: 'https://example.com/elsewhere' }],
    headerMenu: [
      { label: './home', page: 'home', url: null },
      { label: './blog', page: 'blog', url: null },
    ],
    name: 'Seed Name',
    repoUrl: null,
    resume: 'files/michaux-kelley-resume.pdf',
    socials: {
      bluesky: null,
      github: 'https://example.com/github',
      linkedin: 'https://example.com/linkedin',
    },
    tagline: 'seed tagline',
    title: 'seed title',
  },
};

const serviceNames = async (): Promise<string[]> => {
  const { docs } = await payload.find({ collection: 'services', sort: 'order' });
  return docs.map(({ name }) => name);
};

beforeAll(async () => {
  ({ payload, reset, teardown } = await createTestPayload());
}, 120_000);

// Every test starts from an empty database and arranges what it needs.
beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await teardown();
});

describe('fillSeed on an empty database', () => {
  it('creates every record', async () => {
    const report = await fillSeed(payload, seed);

    expect(report.created).toEqual([
      'page home',
      'page blog',
      'site settings',
      'service first',
      'service second',
    ]);
  });

  it('keeps nothing, because nothing was there', async () => {
    const report = await fillSeed(payload, seed);

    expect(report.kept).toEqual([]);
  });

  it('stores the services in the order the Seed lists them', async () => {
    await fillSeed(payload, seed);

    await expect(serviceNames()).resolves.toEqual(['First', 'Second']);
  });

  /**
   * Seeded settings have to be live at once: the build that follows renders
   * every page from them, and it reads as a visitor would.
   */
  it('publishes the Site settings it creates', async () => {
    await fillSeed(payload, seed);

    const settings = await payload.findGlobal({ overrideAccess: false, slug: 'site-settings' });
    expect(settings._status).toBe('published');
  });

  it('uploads the Resume and points Site settings at it', async () => {
    await fillSeed(payload, seed);

    const settings = await payload.findGlobal({ depth: 1, slug: 'site-settings' });
    expect(settings.resume).toMatchObject({
      filename: 'michaux-kelley-resume.pdf',
      mimeType: 'application/pdf',
    });
  });

  /** The build that follows renders every Page, and it reads as a visitor would. */
  it('publishes the Pages it creates', async () => {
    await fillSeed(payload, seed);

    const { docs } = await payload.find({
      collection: 'pages',
      overrideAccess: false,
      sort: 'slug',
    });
    expect(docs.map(({ slug }) => slug)).toEqual(['blog', 'home']);
  });

  /** A link is stored as the id of its Page, so the Page has to exist first. */
  it('points a link at the Page the Seed names by address', async () => {
    await fillSeed(payload, seed);

    const home = await findPublishedPage(payload, 'home');
    expect(home?.blocks?.[0]).toMatchObject({
      blockType: 'hero',
      primaryAction: { label: 'Read the blog', page: { slug: 'blog' } },
    });
  });

  it("uploads a Block's picture with its alt text and attaches it", async () => {
    await fillSeed(payload, seed);

    const home = await findPublishedPage(payload, 'home');
    expect(home?.blocks?.[1]).toMatchObject({
      blockType: 'terminal',
      picture: { alt: 'seed alt text', mimeType: 'image/webp' },
    });
  });

  /**
   * A spec's uploads belong in the directory the harness made for it. Left
   * to Payload's default they land in `media/` under the working tree, where
   * every run leaves another copy and renames the next run's upload.
   */
  it('keeps the pictures it uploads out of the working tree', () => {
    expect(payload.collections.media.config.upload.staticDir).toMatch(
      /payload-uploads-[^/]+\/media$/
    );
  });

  it("stores a role's points one by one", async () => {
    await fillSeed(payload, seed);

    const home = await findPublishedPage(payload, 'home');
    expect(home?.blocks?.[2]).toMatchObject({
      entries: [{ bullets: [{ text: 'first point' }, { text: 'second point' }] }],
    });
  });

  it('counts the files it uploaded: the Resume and the picture', async () => {
    const report = await fillSeed(payload, seed);

    expect(report.uploads).toBe(2);
  });

  it('points each menu item at its Page', async () => {
    await fillSeed(payload, seed);

    const settings = await payload.findGlobal({ depth: 1, slug: 'site-settings' });
    expect(settings.headerMenu).toMatchObject([
      { label: './home', page: { slug: 'home' } },
      { label: './blog', page: { slug: 'blog' } },
    ]);
    expect(settings.footerMenu).toMatchObject([
      { label: 'elsewhere', url: 'https://example.com/elsewhere' },
    ]);
  });

  it('skips nothing', async () => {
    const report = await fillSeed(payload, seed);

    expect(report.skipped).toEqual([]);
  });

  it('uploads no Resume when the Seed carries none', async () => {
    await fillSeed(payload, { ...seed, siteSettings: { ...seed.siteSettings, resume: null } });

    await expect(payload.count({ collection: 'resume-files' })).resolves.toMatchObject({
      totalDocs: 0,
    });
  });
});

describe('fillSeed on a database that is already filled', () => {
  it('creates nothing', async () => {
    await fillSeed(payload, seed);

    const report = await fillSeed(payload, seed);

    expect(report.created).toEqual([]);
  });

  it('reports what it left alone', async () => {
    await fillSeed(payload, seed);

    const report = await fillSeed(payload, seed);

    expect(report.kept).toEqual([
      'page home',
      'page blog',
      'site settings',
      'service first',
      'service second',
    ]);
  });

  it('uploads the Resume once, however often it runs', async () => {
    await fillSeed(payload, seed);
    await fillSeed(payload, seed);

    await expect(payload.count({ collection: 'resume-files' })).resolves.toMatchObject({
      totalDocs: 1,
    });
  });

  it("uploads a Page's picture once, however often it runs", async () => {
    await fillSeed(payload, seed);
    await fillSeed(payload, seed);

    await expect(payload.count({ collection: 'media' })).resolves.toMatchObject({ totalDocs: 1 });
  });

  it('uploads nothing the second time', async () => {
    await fillSeed(payload, seed);

    const report = await fillSeed(payload, seed);

    expect(report.uploads).toBe(0);
  });

  it('never overwrites a Page the owner has edited', async () => {
    await fillSeed(payload, seed);
    await payload.update({
      collection: 'pages',
      data: { title: 'edited by the owner' },
      where: { slug: { equals: 'blog' } },
    });

    await fillSeed(payload, seed);

    await expect(findPublishedPage(payload, 'blog')).resolves.toMatchObject({
      title: 'edited by the owner',
    });
  });

  /** A Page the owner unpublished is still the owner's; the Seed does not put it back. */
  it('leaves a Page the owner unpublished as it is', async () => {
    await fillSeed(payload, seed);
    await payload.update({
      collection: 'pages',
      data: { _status: 'draft' },
      where: { slug: { equals: 'blog' } },
    });

    const report = await fillSeed(payload, seed);

    expect(report.kept).toContain('page blog');
  });

  /**
   * The whole point of fill-only: the owner edits in the admin, and running
   * the Seed again — which every deploy's instructions ask for — must not
   * put the old text back.
   */
  it('never overwrites a service the owner has edited', async () => {
    await fillSeed(payload, seed);
    await payload.update({
      collection: 'services',
      data: { name: 'Edited by the owner' },
      where: { slug: { equals: 'first' } },
    });

    await fillSeed(payload, seed);

    await expect(serviceNames()).resolves.toEqual(['Edited by the owner', 'Second']);
  });

  it('never overwrites Site settings the owner has edited', async () => {
    await fillSeed(payload, seed);
    await payload.updateGlobal({
      data: { _status: 'published', tagline: 'edited by the owner' },
      slug: 'site-settings',
    });

    await fillSeed(payload, seed);

    const settings = await payload.findGlobal({ slug: 'site-settings' });
    expect(settings.tagline).toBe('edited by the owner');
  });

  /** A draft is still the owner's work in progress; the Seed keeps out of it. */
  it('leaves Site settings alone when only a draft has been saved since', async () => {
    await fillSeed(payload, seed);
    await payload.updateGlobal({
      data: { tagline: 'a draft tagline' },
      draft: true,
      slug: 'site-settings',
    });

    const report = await fillSeed(payload, seed);

    expect(report.kept).toContain('site settings');
  });

  it('creates only the record that is missing', async () => {
    await fillSeed(payload, seed);

    const report = await fillSeed(payload, {
      ...seed,
      services: [
        ...seed.services,
        {
          credibility: 'third credibility',
          deliverables: ['four'],
          name: 'Third',
          pitch: 'third pitch',
          slug: 'third',
        },
      ],
    });

    expect(report.created).toEqual(['service third']);
  });
});

describe('fillSeed when the owner got there first', () => {
  /**
   * Settings saved only as a draft have no published record at all, but they
   * are still the owner's. Publishing the Seed over them would discard work.
   */
  it('leaves draft-only Site settings alone', async () => {
    await payload.updateGlobal({
      data: { tagline: "the owner's first draft" },
      draft: true,
      slug: 'site-settings',
    });

    const report = await fillSeed(payload, seed);

    expect(report.kept).toContain('site settings');
  });

  it('does not publish over draft-only Site settings', async () => {
    await payload.updateGlobal({
      data: { tagline: "the owner's first draft" },
      draft: true,
      slug: 'site-settings',
    });

    await fillSeed(payload, seed);

    const draft = await payload.findGlobal({ draft: true, slug: 'site-settings' });
    expect(draft.tagline).toBe("the owner's first draft");
  });
});

/**
 * The live Site settings were saved before menus existed, so their record
 * has never had a menu field. This is that record: the fields are removed
 * from storage, which no save through Payload can do.
 */
describe('fillSeed on Site settings that have never had a menu', () => {
  const forgetMenus = async (): Promise<void> => {
    const { connection } = payload.db as MongooseAdapter;
    await connection
      .collection('globals')
      .updateOne({ globalType: 'site-settings' }, { $unset: { footerMenu: '', headerMenu: '' } });
  };

  const headerLabels = async (): Promise<string[]> => {
    const settings = await findPublishedSiteSettings(payload);
    return (settings?.headerMenu ?? []).map(({ label }) => label);
  };

  beforeEach(async () => {
    await fillSeed(payload, seed);
    await forgetMenus();
  });

  it('adds the menus', async () => {
    const report = await fillSeed(payload, seed);

    expect(report.created).toEqual(['site settings header menu', 'site settings footer menu']);
  });

  it('shows visitors the menus at once', async () => {
    await fillSeed(payload, seed);

    await expect(headerLabels()).resolves.toEqual(['./home', './blog']);
  });

  it('touches nothing else the owner has written', async () => {
    await payload.updateGlobal({
      data: { _status: 'published', tagline: 'edited by the owner' },
      slug: 'site-settings',
    });
    await forgetMenus();

    await fillSeed(payload, seed);

    const settings = await findPublishedSiteSettings(payload);
    expect(settings?.tagline).toBe('edited by the owner');
  });

  it('adds only the menu that was never stored', async () => {
    await fillSeed(payload, seed);
    const { connection } = payload.db as MongooseAdapter;
    await connection
      .collection('globals')
      .updateOne({ globalType: 'site-settings' }, { $unset: { footerMenu: '' } });

    const report = await fillSeed(payload, seed);

    expect(report.created).toEqual(['site settings footer menu']);
  });

  it('adds them only once', async () => {
    await fillSeed(payload, seed);

    const report = await fillSeed(payload, seed);

    expect(report.created).toEqual([]);
  });

  /** A menu the owner emptied is stored as empty, and is the owner's decision. */
  it('leaves a menu the owner emptied on purpose empty', async () => {
    await fillSeed(payload, seed);
    await payload.updateGlobal({
      data: { _status: 'published', headerMenu: [] },
      slug: 'site-settings',
    });

    await fillSeed(payload, seed);

    await expect(headerLabels()).resolves.toEqual([]);
  });

  /** Adding a menu is a published save, and the Seed must not publish for the owner. */
  it('waits while the owner has unpublished changes', async () => {
    await payload.updateGlobal({
      data: { tagline: 'a draft tagline' },
      draft: true,
      slug: 'site-settings',
    });
    await forgetMenus();

    const report = await fillSeed(payload, seed);

    expect(report.skipped).toEqual([
      expect.stringContaining('site settings header menu (Site settings have unpublished changes'),
      expect.stringContaining('site settings footer menu (Site settings have unpublished changes'),
    ]);
  });

  it('does not publish the owner’s draft while it waits', async () => {
    await payload.updateGlobal({
      data: { tagline: 'a draft tagline' },
      draft: true,
      slug: 'site-settings',
    });
    await forgetMenus();

    await fillSeed(payload, seed);

    const settings = await findPublishedSiteSettings(payload);
    expect(settings?.tagline).toBe('seed tagline');
  });

  it('waits while the owner has the settings unpublished', async () => {
    await payload.updateGlobal({ data: { _status: 'draft' }, slug: 'site-settings' });
    await forgetMenus();

    const report = await fillSeed(payload, seed);

    expect(report.skipped).toEqual([
      expect.stringContaining('site settings header menu (Site settings are unpublished'),
      expect.stringContaining('site settings footer menu (Site settings are unpublished'),
    ]);
  });
});

describe('fillSeed on Blocks that point elsewhere', () => {
  const linking: Seed = {
    ...seed,
    pages: [
      ...pages,
      {
        blocks: [
          {
            blockType: 'timeline',
            command: null,
            entries: [{ marker: null, period: null, title: 'an entry' }],
            link: { label: 'the blog', page: 'blog', url: null },
          },
          {
            blockType: 'timeline',
            command: null,
            entries: [{ marker: null, period: null, title: 'an entry' }],
            link: null,
          },
          {
            blockType: 'picture',
            caption: 'a caption',
            media: { alt: 'a second picture', file: 'files/headshot.webp' },
          },
          {
            blockType: 'terminal',
            body: paragraph('text with no picture'),
            command: null,
            picture: null,
            pictureStyle: 'plain',
          },
        ],
        command: null,
        intro: null,
        meta: noMeta,
        slug: 'now',
        title: 'now',
      },
    ],
  };

  it("points a Timeline's link at its Page", async () => {
    await fillSeed(payload, linking);

    const now = await findPublishedPage(payload, 'now');
    expect(now?.blocks?.[0]).toMatchObject({ link: { page: { slug: 'blog' } } });
  });

  it('stores a Timeline that has no link', async () => {
    await fillSeed(payload, linking);

    const now = await findPublishedPage(payload, 'now');
    expect(now?.blocks?.[1]).toMatchObject({ blockType: 'timeline' });
  });

  it("uploads a Picture Block's picture", async () => {
    await fillSeed(payload, linking);

    const now = await findPublishedPage(payload, 'now');
    expect(now?.blocks?.[2]).toMatchObject({ media: { alt: 'a second picture' } });
  });

  it('stores a Terminal that has no picture', async () => {
    await fillSeed(payload, linking);

    const now = await findPublishedPage(payload, 'now');
    expect(now?.blocks?.[3]).toMatchObject({ blockType: 'terminal', picture: null });
  });
});

describe('fillSeed when a Page cannot be saved', () => {
  /** An address the admin would refuse, which the schema normally keeps out of a Seed. */
  const unsaveable: Seed = {
    ...seed,
    pages: [{ ...pages[0], slug: 'admin' } as Seed['pages'][number]],
    siteSettings: { ...seed.siteSettings, headerMenu: [] },
  };

  it('fails', async () => {
    await expect(fillSeed(payload, unsaveable)).rejects.toThrow();
  });

  /** Left behind, the next run would upload a second copy beside it. */
  it('removes the picture it had just uploaded', async () => {
    await fillSeed(payload, unsaveable).catch(() => undefined);

    await expect(payload.count({ collection: 'media' })).resolves.toMatchObject({ totalDocs: 0 });
  });
});

describe('fillSeed when saving the Site settings fails', () => {
  /** A link the admin would refuse, which the schema normally keeps out of a Seed. */
  const unsaveable: Seed = {
    ...seed,
    siteSettings: {
      ...seed.siteSettings,
      socials: { ...seed.siteSettings.socials, github: 'not-an-address' },
    },
  };

  it('fails', async () => {
    await expect(fillSeed(payload, unsaveable)).rejects.toThrow();
  });

  /**
   * The Resume is uploaded before the settings that point at it are saved.
   * If the save fails, the upload must not stay behind: the next run would
   * upload a second copy beside it.
   */
  it('removes the Resume it had just uploaded', async () => {
    await fillSeed(payload, unsaveable).catch(() => undefined);

    await expect(payload.count({ collection: 'resume-files' })).resolves.toMatchObject({
      totalDocs: 0,
    });
  });
});

/** A Timeline whose link names a Page, the plainest Block that can point at one. */
const linkTo = (target: string) => ({
  blockType: 'timeline' as const,
  command: null,
  entries: [{ marker: null, period: null, title: 'an entry' }],
  link: { label: target, page: target, url: null },
});

const terminal = (body: ReturnType<typeof richText>, picture: null | string = null) => ({
  blockType: 'terminal' as const,
  body,
  command: null,
  picture: picture === null ? null : { alt: 'a picture', file: picture },
  pictureStyle: 'plain' as const,
});

const pageOf = (
  slug: string,
  ...blocks: Seed['pages'][number]['blocks']
): Seed['pages'][number] => ({
  blocks,
  command: null,
  intro: null,
  meta: noMeta,
  slug,
  title: slug,
});

/** A Seed of nothing but these Pages: no menu points at one that is missing. */
const seedOf = (...of: Seed['pages'][number][]): Seed => ({
  ...seed,
  pages: of,
  siteSettings: { ...seed.siteSettings, headerMenu: [] },
});

/** A picture inside text, as the Seed names it. */
const pictureInText = {
  fields: null,
  format: '',
  relationTo: 'media',
  type: 'upload',
  value: { alt: 'a picture in the text', file: 'files/headshot.webp' },
  version: 3,
};

describe('fillSeed on text that points elsewhere', () => {
  const withText = seedOf(
    pageOf('blog'),
    pageOf(
      'now',
      terminal(richText(words('Read ', docLink('pages', 'blog', 'the blog'), '.'))),
      terminal(richText(pictureInText))
    )
  );

  /** The editor stores a link to a Page as its id, which the Seed cannot know. */
  it('points a link in the text at the Page the Seed names by address', async () => {
    await fillSeed(payload, withText);

    const now = await findPublishedPage(payload, 'now');
    expect(now?.blocks?.[0]).toMatchObject({
      body: {
        root: {
          children: [
            {
              children: [
                {},
                { fields: { doc: { relationTo: 'pages', value: { slug: 'blog' } } } },
                {},
              ],
            },
          ],
        },
      },
    });
  });

  it('uploads a picture the text shows', async () => {
    await fillSeed(payload, withText);

    const now = await findPublishedPage(payload, 'now');
    expect(now?.blocks?.[1]).toMatchObject({
      body: { root: { children: [{ value: { alt: 'a picture in the text' } }] } },
    });
  });

  it('counts the picture among the files it uploaded', async () => {
    const report = await fillSeed(payload, withText);

    expect(report.uploads).toBe(2);
  });
});

/**
 * A link is stored as the id of its target, so the target has to exist
 * first — and Pages that link to each other cannot both be first. The live
 * site's Pages may well link in a circle, and Capture writes what it finds.
 */
describe('fillSeed on Pages that link in a circle', () => {
  const circle = seedOf(pageOf('home', linkTo('cv')), pageOf('cv', linkTo('home')));

  it('creates every one of them', async () => {
    const report = await fillSeed(payload, circle);

    expect(report.created).toEqual(expect.arrayContaining(['page home', 'page cv']));
  });

  it('publishes every one of them', async () => {
    await fillSeed(payload, circle);

    const { docs } = await payload.find({
      collection: 'pages',
      overrideAccess: false,
      sort: 'slug',
    });
    expect(docs.map(({ slug }) => slug)).toEqual(['cv', 'home']);
  });

  it('points the first of them at the second', async () => {
    await fillSeed(payload, circle);

    const home = await findPublishedPage(payload, 'home');
    expect(home?.blocks?.[0]).toMatchObject({ link: { page: { slug: 'cv' } } });
  });

  it('points the second of them back at the first', async () => {
    await fillSeed(payload, circle);

    const cv = await findPublishedPage(payload, 'cv');
    expect(cv?.blocks?.[0]).toMatchObject({ link: { page: { slug: 'home' } } });
  });

  it('creates a Page that links to itself', async () => {
    await fillSeed(payload, seedOf(pageOf('now', linkTo('now'))));

    const now = await findPublishedPage(payload, 'now');
    expect(now?.blocks?.[0]).toMatchObject({ link: { page: { slug: 'now' } } });
  });

  it('closes a circle that runs through a link in the text', async () => {
    const throughText = seedOf(
      pageOf('home', terminal(richText(words(docLink('pages', 'cv', 'my CV'))))),
      pageOf('cv', linkTo('home'))
    );

    await fillSeed(payload, throughText);

    const home = await findPublishedPage(payload, 'home');
    expect(home?.blocks?.[0]).toMatchObject({
      body: {
        root: { children: [{ children: [{ fields: { doc: { value: { slug: 'cv' } } } }] }] },
      },
    });
  });

  it('creates nothing the second time', async () => {
    await fillSeed(payload, circle);

    const second = await fillSeed(payload, circle);

    expect(second.created).toEqual([]);
  });
});

/**
 * A Page that exists is never touched again. A circle that stopped half-way
 * would leave a Page empty for good, or one pointing at a Page that was
 * never finished — so a failed circle is taken back whole, and the next run
 * starts over.
 */
describe('fillSeed when a Page in a circle cannot be saved', () => {
  const broken = seedOf(
    pageOf('home', linkTo('cv'), terminal(richText(words('about')), 'files/headshot.webp')),
    pageOf('cv', linkTo('home'), terminal(richText(words('cv')), 'files/not-in-the-seed.webp'))
  );

  it('fails', async () => {
    await expect(fillSeed(payload, broken)).rejects.toThrow();
  });

  it('leaves none of the circle behind', async () => {
    await fillSeed(payload, broken).catch(() => undefined);

    await expect(payload.count({ collection: 'pages' })).resolves.toMatchObject({ totalDocs: 0 });
  });

  it('removes the pictures it had uploaded for the circle', async () => {
    await fillSeed(payload, broken).catch(() => undefined);

    await expect(payload.count({ collection: 'media' })).resolves.toMatchObject({ totalDocs: 0 });
  });

  it('leaves a Page it created before the circle where it is', async () => {
    const afterAnother = seedOf(pageOf('blog'), ...broken.pages);

    await fillSeed(payload, afterAnother).catch(() => undefined);

    await expect(findPublishedPage(payload, 'blog')).resolves.toMatchObject({ slug: 'blog' });
  });
});

describe('fillSeed on posts', () => {
  const post = {
    body: richText(words('Hello. ', docLink('pages', 'blog', 'More posts'))),
    excerpt: null,
    publishedAt: '2024-02-06T12:00:00.000Z',
    slug: 'hello',
    tags: ['react'],
    title: 'Hello',
  };
  const withPosts: Seed = { ...seed, posts: [post] };

  const hello = async () => {
    const { docs } = await payload.find({
      collection: 'posts',
      where: { slug: { equals: 'hello' } },
    });
    return docs;
  };

  it('creates a post the database lacks', async () => {
    const report = await fillSeed(payload, withPosts);

    expect(report.created).toContain('post hello');
  });

  /** The build that follows lists the posts, and it reads as a visitor would. */
  it('publishes the post with the date the Seed gives it', async () => {
    await fillSeed(payload, withPosts);

    const { docs } = await payload.find({ collection: 'posts', overrideAccess: false });
    expect(docs).toMatchObject([
      { publishedAt: '2024-02-06T12:00:00.000Z', slug: 'hello', tags: ['react'], title: 'Hello' },
    ]);
  });

  it('points a link in the post at the Page the Seed names by address', async () => {
    await fillSeed(payload, withPosts);

    const [stored] = await hello();
    expect(stored?.body).toMatchObject({
      root: { children: [{ children: [{}, { fields: { doc: { value: { slug: 'blog' } } } }] }] },
    });
  });

  it('uploads a picture the post shows', async () => {
    const pictured: Seed = { ...seed, posts: [{ ...post, body: richText(pictureInText) }] };

    const report = await fillSeed(payload, pictured);

    expect(report.uploads).toBe(3);
  });

  it('never overwrites a post the owner has edited', async () => {
    await fillSeed(payload, withPosts);
    const [created] = await hello();
    await payload.update({
      collection: 'posts',
      data: { title: 'edited by the owner' },
      id: created?.id ?? 'missing',
    });

    await fillSeed(payload, withPosts);

    await expect(hello()).resolves.toMatchObject([{ title: 'edited by the owner' }]);
  });

  it('reports a post that was already there as kept', async () => {
    await fillSeed(payload, withPosts);

    const second = await fillSeed(payload, withPosts);

    expect(second.kept).toContain('post hello');
  });

  /** A draft at the same slug is the owner's work, and the Seed publishes nothing for them. */
  it('leaves a draft the owner has at the same slug as it is', async () => {
    await payload.create({
      collection: 'posts',
      data: { ...post, body: richText(words('a draft')), status: 'draft', title: 'A draft' },
    });

    await fillSeed(payload, withPosts);

    await expect(hello()).resolves.toMatchObject([{ status: 'draft', title: 'A draft' }]);
  });
});

describe('the Resume uploads collection', () => {
  /** The address the Resume is served at promises a PDF. */
  it('refuses an upload that is not a PDF', async () => {
    await expect(
      payload.create({
        collection: 'resume-files',
        data: {},
        file: { data: Buffer.from('plain text'), mimetype: 'text/plain', name: 'cv.txt', size: 10 },
      })
    ).rejects.toThrow();
  });
});

/**
 * The specs above fill a small Seed of their own. This fills the one the
 * repo carries — what CI, the E2E harness and the owner's `pnpm seed` run —
 * so a Seed file Payload would refuse fails here, before a build does.
 */
describe('the committed Seed', () => {
  it('fills an empty database with every Page it carries', async () => {
    const committed = loadSeed('seed');

    const { created } = await fillSeed(payload, committed);

    expect(created).toEqual(expect.arrayContaining(committed.pages.map(pageLabel)));
  });

  /** It is published with its two guarded Blocks in place (docs/adr/0002). */
  it('gives visitors a privacy Page with what it must hold', async () => {
    await fillSeed(payload, loadSeed('seed'));

    const privacy = await findPublishedPage(payload, 'privacy');

    expect(privacy?.blocks?.map(({ blockType }) => blockType)).toEqual([
      'terminal',
      'cookieInventory',
      'managePreferences',
      'terminal',
    ]);
  });
});
