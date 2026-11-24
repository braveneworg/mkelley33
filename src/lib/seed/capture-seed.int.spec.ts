/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { type Captured, captureSeed } from '@/lib/seed/capture-seed';
import { findPageId } from '@/lib/seed/fill-pages';
import { fillSeed } from '@/lib/seed/fill-seed';
import { loadSeed, SEED_JSON } from '@/lib/seed/seed-files';
import { knownSeedFiles, writeSeed } from '@/lib/seed/write-seed';
import type { Page } from '@/payload-types';
import { docLink, paragraph, richText } from '@/test/lexical';
import { createTestPayload } from '@/test/payload-harness';

import type { Payload } from 'payload';

let payload: Payload;
let reset: () => Promise<void>;
let teardown: () => Promise<void>;
let directory: string;

const committed = loadSeed('seed');

beforeAll(async () => {
  ({ payload, reset, teardown } = await createTestPayload());
}, 120_000);

// Every test starts from the site as the committed Seed makes it.
beforeEach(async () => {
  await reset();
  await fillSeed(payload, committed);
  directory = mkdtempSync(path.join(tmpdir(), 'captured-seed-'));
});

afterEach(() => {
  rmSync(directory, { force: true, recursive: true });
});

afterAll(async () => {
  await teardown();
});

/** A Capture the way `pnpm capture` runs it: knowing the files the Seed holds now. */
const capture = async (): Promise<Captured> => captureSeed(payload, await knownSeedFiles('seed'));

const idOf = async (slug: string): Promise<string> =>
  (await findPageId(payload, slug)) ?? 'missing';

const pageIn = ({ content }: Captured, slug: string) =>
  content.pages.find((page) => page.slug === slug);

const terminal = (body: ReturnType<typeof richText>, picture: null | string = null) => ({
  blockType: 'terminal' as const,
  body,
  picture,
  pictureStyle: 'plain' as const,
});

const publishPage = (slug: string, ...blocks: NonNullable<Page['blocks']>) =>
  payload.create({
    collection: 'pages',
    data: { _status: 'published', blocks, slug, title: slug },
  });

/** What the admin's Unpublish button does: the record itself goes back to draft. */
const unpublishPage = async (slug: string) =>
  payload.update({
    collection: 'pages',
    data: { _status: 'draft', title: 'edited while unpublished' },
    id: await idOf(slug),
  });

/** The smallest PNG there is: one pixel. A picture the Seed does not hold yet. */
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

const uploadPicture = (name: string, alt: string, data = PIXEL, mimetype = 'image/png') =>
  payload.create({
    collection: 'media',
    data: { alt },
    file: { data, mimetype, name, size: data.length },
  });

/**
 * The promise the whole design rests on: Capture rewrites exactly what the
 * Seed reads. A site nobody has edited since it was seeded captures back to
 * the same files, so `git diff` after a Capture shows the owner's edits and
 * nothing else.
 */
describe('capturing a site nobody has edited since it was seeded', () => {
  const read = (from: string, name: string): string => readFileSync(path.join(from, name), 'utf8');

  it.each(Object.values(SEED_JSON))('writes %s back byte for byte', async (name) => {
    await writeSeed(directory, await capture());

    expect(read(directory, name)).toBe(read('seed', name));
  });

  it('writes back the files the Seed holds, under the names they have', async () => {
    await writeSeed(directory, await capture());

    expect(readdirSync(path.join(directory, 'files')).sort()).toEqual(
      readdirSync('seed/files').sort()
    );
  });

  it('writes the Resume back with the bytes it had', async () => {
    await writeSeed(directory, await capture());

    expect(readFileSync(path.join(directory, 'files/michaux-kelley-resume.pdf'))).toEqual(
      readFileSync('seed/files/michaux-kelley-resume.pdf')
    );
  });

  /**
   * Not the bytes the Seed had: Payload re-encodes a WebP as it stores it,
   * so the picture the site serves is no longer the file that was uploaded.
   * Capture takes what the site serves.
   */
  it('writes a picture back with the bytes the site serves', async () => {
    await writeSeed(directory, await capture());

    const { staticDir = 'media' } = payload.collections.media.config.upload;
    expect(readFileSync(path.join(directory, 'files/headshot.webp'))).toEqual(
      readFileSync(path.join(staticDir, 'headshot.webp'))
    );
  });

  it('leaves nothing out', async () => {
    await expect(capture()).resolves.toMatchObject({ leftOut: [] });
  });

  it('writes a Seed the fill accepts', async () => {
    await writeSeed(directory, await capture());

    expect(loadSeed(directory).pages).toEqual(committed.pages);
  });
});

describe('captureSeed on Pages', () => {
  it('lists the Pages in the order of their addresses', async () => {
    const { content } = await capture();

    expect(content.pages.map(({ slug }) => slug)).toEqual([
      'blog',
      'contact',
      'cv',
      'home',
      'privacy',
      'services',
      'uses',
    ]);
  });

  it('takes a Page the owner has added and published', async () => {
    await publishPage('now', terminal(richText(paragraph('What I am doing now.'))));

    expect(pageIn(await capture(), 'now')).toMatchObject({
      blocks: [{ blockType: 'terminal', command: null, picture: null }],
      command: null,
      intro: null,
      meta: { description: null, title: null },
      title: 'now',
    });
  });

  it('takes what the owner has published over what the Seed said', async () => {
    await payload.update({
      collection: 'pages',
      data: { intro: 'a new intro' },
      id: await idOf('uses'),
    });

    expect(pageIn(await capture(), 'uses')).toMatchObject({ intro: 'a new intro' });
  });

  /** Unpublished drafts are never captured (`CONTEXT.md`). */
  it('leaves out a Page that has only ever been a draft', async () => {
    await payload.create({
      collection: 'pages',
      data: { blocks: [], slug: 'now', title: 'a secret plan' },
      draft: true,
    });

    expect(pageIn(await capture(), 'now')).toBeUndefined();
  });

  it('takes the published text while a newer draft exists', async () => {
    await payload.update({
      collection: 'pages',
      data: { intro: 'a draft nobody has seen' },
      draft: true,
      id: await idOf('uses'),
    });

    const seeded = committed.pages.find(({ slug }) => slug === 'uses');
    expect(pageIn(await capture(), 'uses')).toEqual(seeded);
  });

  it('takes an unpublished Fixed Page as it was last published', async () => {
    await unpublishPage('blog');

    expect(pageIn(await capture(), 'blog')).toMatchObject({ title: 'blog' });
  });
});

/** A Page visitors are not served is not in the Seed, so nothing in it can point there. */
describe('captureSeed on a Page the owner has unpublished', () => {
  beforeEach(async () => {
    await unpublishPage('uses');
  });

  it('leaves the Page out', async () => {
    expect(pageIn(await capture(), 'uses')).toBeUndefined();
  });

  /** The site hides the item too, until the Page is published again. */
  it('leaves out the menu item that points at it', async () => {
    const { content } = await capture();

    expect(content.siteSettings.footerMenu).toEqual([]);
  });

  it('says which link it left out, and where', async () => {
    const { leftOut } = await capture();

    expect(leftOut).toEqual([
      'site settings footer menu: the link "uses": its Page is not published',
    ]);
  });

  it('still writes a Seed the fill accepts', async () => {
    await writeSeed(directory, await capture());

    expect(() => loadSeed(directory)).not.toThrow();
  });
});

describe('captureSeed on text that points elsewhere', () => {
  it('names the Page a link in the text points at by its address', async () => {
    const contact = await idOf('contact');
    await publishPage('now', terminal(richText(paragraph(docLink('pages', contact, 'Say hello')))));

    expect(pageIn(await capture(), 'now')?.blocks[0]).toMatchObject({
      body: richText(paragraph(docLink('pages', 'contact', 'Say hello'))),
    });
  });

  it('keeps the words of a link to a Page that is not published', async () => {
    const { id } = await payload.create({
      collection: 'pages',
      data: { blocks: [], slug: 'later', title: 'later' },
      draft: true,
    });
    await publishPage('now', terminal(richText(paragraph(docLink('pages', id, 'Coming soon')))));

    expect(pageIn(await capture(), 'now')?.blocks[0]).toMatchObject({
      body: richText(paragraph('Coming soon')),
    });
  });

  it('says where it left a link out', async () => {
    const { id } = await payload.create({
      collection: 'pages',
      data: { blocks: [], slug: 'later', title: 'later' },
      draft: true,
    });
    await publishPage('now', terminal(richText(paragraph(docLink('pages', id, 'Coming soon')))));

    const { leftOut } = await capture();

    expect(leftOut).toEqual([
      'page now: the link on "Coming soon": it points at a Page that is not published, ' +
        'or at another kind of record',
    ]);
  });
});

/**
 * The owner's Pages may link to each other in a circle. Capture writes what
 * it finds, and the fill has to make the same site from it again.
 */
describe('captureSeed on Pages that link in a circle', () => {
  const linkTo = (page: string) => ({
    blockType: 'timeline' as const,
    entries: [{ title: 'an entry' }],
    link: { label: 'next', page },
  });

  beforeEach(async () => {
    const now = await publishPage('now');
    const later = await publishPage('later', linkTo(now.id));
    await payload.update({
      collection: 'pages',
      data: { blocks: [linkTo(later.id)] },
      id: now.id,
    });
  });

  it('names each Page in the circle by its address', async () => {
    const captured = await capture();

    expect([
      pageIn(captured, 'now')?.blocks[0],
      pageIn(captured, 'later')?.blocks[0],
    ]).toMatchObject([{ link: { page: 'later' } }, { link: { page: 'now' } }]);
  });

  it('writes a Seed that fills an empty database with the same site', async () => {
    const first = await capture();
    await writeSeed(directory, first);
    await reset();

    await fillSeed(payload, loadSeed(directory));

    await expect(capture()).resolves.toMatchObject({ content: first.content });
  });
});

describe('captureSeed on pictures', () => {
  it('takes a picture the owner has added, with its alt text', async () => {
    const { id } = await uploadPicture('diagram.png', 'how it fits together');
    await publishPage('now', { blockType: 'picture', caption: 'the plan', media: id });

    expect(pageIn(await capture(), 'now')?.blocks).toEqual([
      {
        blockType: 'picture',
        caption: 'the plan',
        media: { alt: 'how it fits together', file: 'files/diagram.png' },
      },
    ]);
  });

  it('takes the bytes of a picture the owner has added', async () => {
    const { id } = await uploadPicture('diagram.png', 'how it fits together');
    await publishPage('now', { blockType: 'picture', media: id });

    const { files } = await capture();

    expect(files.get('files/diagram.png')).toEqual(PIXEL);
  });

  it('takes a picture shown inside a Page’s text', async () => {
    const { id } = await uploadPicture('diagram.png', 'how it fits together');
    const shown = { relationTo: 'media', type: 'upload', value: id, version: 3 };
    await publishPage('now', terminal(richText(shown)));

    expect(pageIn(await capture(), 'now')?.blocks[0]).toMatchObject({
      body: {
        root: { children: [{ value: { alt: 'how it fits together', file: 'files/diagram.png' } }] },
      },
    });
  });

  /** An upload only a draft shows is not published, so it is not the Seed's to hold. */
  it('leaves out a picture no published Page shows', async () => {
    await uploadPicture('unused.png', 'not shown anywhere');

    const { files } = await capture();

    expect([...files.keys()].sort()).toEqual([
      'files/headshot.webp',
      'files/michaux-kelley-resume.pdf',
    ]);
  });

  it('takes a Terminal without the picture when its upload is gone', async () => {
    const { id } = await uploadPicture('diagram.png', 'how it fits together');
    await publishPage('now', terminal(richText(paragraph('text')), id));
    await payload.delete({ collection: 'media', id });

    expect(pageIn(await capture(), 'now')?.blocks[0]).toMatchObject({ picture: null });
  });

  it('leaves out a Picture Block whose upload is gone', async () => {
    const { id } = await uploadPicture('diagram.png', 'how it fits together');
    await publishPage('now', { blockType: 'picture', media: id });
    await payload.delete({ collection: 'media', id });

    expect(pageIn(await capture(), 'now')?.blocks).toEqual([]);
  });

  it('says where a picture was left out', async () => {
    const { id } = await uploadPicture('diagram.png', 'how it fits together');
    await publishPage('now', { blockType: 'picture', media: id });
    await payload.delete({ collection: 'media', id });

    const { leftOut } = await capture();

    expect(leftOut).toEqual([
      'page now: a picture: its upload is gone, or is not a kind of picture the Seed carries',
    ]);
  });

  /** The Media library takes any file; a Block's picture has to be a picture. */
  it('leaves out an upload that is not a picture', async () => {
    const pdf = readFileSync('seed/files/michaux-kelley-resume.pdf');
    const { id } = await uploadPicture('a-document.pdf', 'a document', pdf, 'application/pdf');
    await publishPage('now', terminal(richText(paragraph('text')), id));

    expect(pageIn(await capture(), 'now')?.blocks[0]).toMatchObject({ picture: null });
  });
});

describe('captureSeed on Site settings', () => {
  it('takes what the owner has published over what the Seed said', async () => {
    await payload.updateGlobal({
      data: { _status: 'published', tagline: 'a new tagline' },
      slug: 'site-settings',
    });

    const { content } = await capture();

    expect(content.siteSettings.tagline).toBe('a new tagline');
  });

  it('takes the published settings while a newer draft exists', async () => {
    await payload.updateGlobal({
      data: { tagline: 'a draft nobody has seen' },
      draft: true,
      slug: 'site-settings',
    });

    const { content } = await capture();

    expect(content.siteSettings).toEqual(committed.siteSettings);
  });

  it('takes the Resume the owner has uploaded since', async () => {
    const data = Buffer.concat([readFileSync('seed/files/michaux-kelley-resume.pdf'), PIXEL]);
    const { id } = await payload.create({
      collection: 'resume-files',
      data: {},
      file: { data, mimetype: 'application/pdf', name: 'newer.pdf', size: data.length },
    });
    await payload.updateGlobal({
      data: { _status: 'published', resume: id },
      slug: 'site-settings',
    });

    const { files } = await capture();

    expect(files.get('files/michaux-kelley-resume.pdf')).toEqual(data);
  });

  it('carries no Resume when the owner has taken it down', async () => {
    await payload.updateGlobal({
      data: { _status: 'published', resume: null },
      slug: 'site-settings',
    });

    const { content, files } = await capture();

    expect([content.siteSettings.resume, files.has('files/michaux-kelley-resume.pdf')]).toEqual([
      null,
      false,
    ]);
  });

  it('carries no link the owner has cleared', async () => {
    await payload.updateGlobal({
      data: { _status: 'published', repoUrl: null },
      slug: 'site-settings',
    });

    const { content } = await capture();

    expect(content.siteSettings.repoUrl).toBeNull();
  });
});

describe('captureSeed on services', () => {
  it('lists them in the order the site shows them', async () => {
    const { content } = await capture();

    expect(content.services).toEqual(committed.services);
  });
});

describe('captureSeed on posts', () => {
  const post = (slug: string, status: 'draft' | 'published') =>
    payload.create({
      collection: 'posts',
      data: {
        body: richText(paragraph(`The text of ${slug}.`)),
        publishedAt: '2024-02-06T12:00:00.000Z',
        slug,
        status,
        title: `Title of ${slug}`,
      },
    });

  it('takes the published posts, by slug', async () => {
    await post('second', 'published');
    await post('first', 'published');

    const { content } = await capture();

    expect(content.posts.map(({ slug }) => slug)).toEqual(['first', 'second']);
  });

  it('takes a post as the Seed carries one', async () => {
    await post('first', 'published');

    const { content } = await capture();

    expect(content.posts).toEqual([
      {
        body: richText(paragraph('The text of first.')),
        excerpt: null,
        publishedAt: '2024-02-06T12:00:00.000Z',
        slug: 'first',
        tags: [],
        title: 'Title of first',
      },
    ]);
  });

  /** Unpublished drafts are never captured (`CONTEXT.md`). */
  it('leaves out a post that is a draft', async () => {
    await post('unfinished', 'draft');

    const { content } = await capture();

    expect(content.posts).toEqual([]);
  });
});

/**
 * The Seed is public and committed. Visitor data — and the owner's login —
 * must never reach it (`CONTEXT.md`), whatever else changes in Capture.
 */
describe('captureSeed and what is not Owner content', () => {
  const everythingWritten = async (): Promise<string> => {
    await writeSeed(directory, await capture());
    return Object.values(SEED_JSON)
      .map((name) => readFileSync(path.join(directory, name), 'utf8'))
      .join('\n');
  };

  it('takes no subscriber', async () => {
    await payload.create({
      collection: 'subscribers',
      data: { email: 'subscriber@example.test', status: 'active' },
    });

    await expect(everythingWritten()).resolves.not.toContain('subscriber@example.test');
  });

  it('takes no contact message', async () => {
    await payload.create({
      collection: 'contact-submissions',
      data: {
        email: 'sender@example.test',
        message: 'a private message',
        name: 'A Sender',
        reason: 'general',
        status: 'new',
      },
    });

    await expect(everythingWritten()).resolves.not.toMatch(
      /sender@example\.test|a private message/
    );
  });

  it('takes no comment', async () => {
    const { id } = await payload.create({
      collection: 'posts',
      data: {
        body: richText(paragraph('A post.')),
        publishedAt: '2024-02-06T12:00:00.000Z',
        slug: 'a-post',
        status: 'published',
        title: 'A post',
      },
    });
    await payload.create({
      collection: 'comments',
      data: {
        authorEmail: 'reader@example.test',
        authorName: 'A Reader',
        body: 'what a reader wrote',
        post: id,
        status: 'approved',
      },
    });

    await expect(everythingWritten()).resolves.not.toMatch(
      /reader@example\.test|what a reader wrote/
    );
  });

  it('takes nothing of the owner’s login', async () => {
    await payload.create({
      collection: 'users',
      data: { email: 'owner@example.test', password: 'a-long-test-password' },
    });

    await expect(everythingWritten()).resolves.not.toContain('owner@example.test');
  });
});

describe('captureSeed on a database with no published Site settings', () => {
  it('refuses, because a Seed cannot be without them', async () => {
    await reset();

    await expect(capture()).rejects.toThrow('No Site settings have been published');
  });
});

describe('captureSeed', () => {
  /** It is run against the live database, and must leave it exactly as it was. */
  it('writes nothing to the database', async () => {
    const versions = () => payload.countVersions({ collection: 'pages' });
    const before = await versions();

    await capture();

    await expect(versions()).resolves.toEqual(before);
  });
});
