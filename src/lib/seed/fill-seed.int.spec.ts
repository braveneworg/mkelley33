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
