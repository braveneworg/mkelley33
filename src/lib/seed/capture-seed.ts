/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Capture: the Seed as the site currently publishes it (see `CONTEXT.md`).
 * It reads a database and writes nothing to it. `write-seed.ts` puts what
 * this returns into the repo's `seed/` directory, and the owner sends that
 * through a PR and the gate like any other change.
 *
 * It takes what visitors are served and nothing else: the Pages the menus
 * and the sitemap list, the published Site settings, the services, the
 * published posts, and the files those show. A draft, a version from the
 * history, and all Visitor data — subscribers, contact messages, comments —
 * are never read. The Seed is public, and every part of it is checked
 * against the Seed's own strict schemas before this returns.
 */

import { findPublishedPages } from '@/collections/published-page';
import { findPublishedSiteSettings } from '@/globals/published-site-settings';
import { captureFiles, isCarriedPicture } from '@/lib/seed/capture-files';
import { capturePage, orNull, type StoredLink, toLinkSeed } from '@/lib/seed/capture-pages';
import type { LinkSeed } from '@/lib/seed/page-seed';
import type { PostSeed } from '@/lib/seed/post-seed';
import { readUpload } from '@/lib/seed/read-upload';
import {
  filesNamedBy,
  parseSeed,
  type SeedContent,
  type ServiceSeed,
  type SiteSettingsSeed,
} from '@/lib/seed/seed-files';
import { type SeedRefs, storedId, toSeedText } from '@/lib/seed/seed-text';
import { type PictureSeed, SEED_FILES } from '@/lib/seed/seed-values';
import { RESUME_PATH } from '@/lib/site-config';
import type { Post, SiteSetting } from '@/payload-types';

import type { Payload } from 'payload';

export interface Captured {
  /** What the Seed's JSON files will hold. */
  readonly content: SeedContent;
  /** The bytes of every file the Seed names, by that name (`files/…`). */
  readonly files: ReadonlyMap<string, Buffer>;
  /**
   * What the site holds and the Seed could not carry, each saying where it
   * was. Visitors do not see any of it either — a link to an unpublished
   * Page, a picture whose upload is gone — so the Seed still matches the
   * site; the list is there so the owner knows.
   */
  readonly leftOut: string[];
}

/** The Resume has one address on the site, and one name in the Seed. */
const RESUME_FILE = `${SEED_FILES}${RESUME_PATH.slice(1)}`;

/** What every part of a Capture reads through. */
interface Reading {
  readonly files: ReturnType<typeof captureFiles>;
  readonly leftOut: string[];
  readonly payload: Payload;
  /** The Seed's picture for each Media upload already looked at, by its id. */
  readonly pictures: Map<string, null | PictureSeed>;
  /** The address of every Page visitors are served, by its id. */
  readonly slugs: ReadonlyMap<string, string>;
}

/** A filter for the one record with this id; none match when the record is gone. */
const withId = (id: string) => ({ depth: 0, limit: 1, where: { id: { equals: id } } });

const readPicture = async (
  { files, payload }: Reading,
  id: string
): Promise<null | PictureSeed> => {
  const { docs } =
    id === '' ? { docs: [] } : await payload.find({ collection: 'media', ...withId(id) });
  const upload = docs[0];
  if (!upload?.filename || !isCarriedPicture(upload.filename)) {
    return null;
  }
  const bytes = await readUpload(payload, payload.collections.media.config, upload);
  return { alt: upload.alt, file: files.add(bytes, upload.filename) };
};

/** What a record's text and links are read through; `where` says which record. */
const refsFor = (reading: Reading, where: string): SeedRefs => ({
  leftOut: (what) => {
    reading.leftOut.push(`${where}: ${what}`);
  },
  pageSlug: (id) => reading.slugs.get(id),
  picture: async (id) => {
    const seen = reading.pictures.get(id);
    if (seen !== undefined) {
      return seen;
    }
    const picture = await readPicture(reading, id);
    reading.pictures.set(id, picture);
    return picture;
  },
});

/** A menu as the Seed carries it: the items the site shows, in their order. */
const captureMenu = (menu: null | StoredLink[] | undefined, refs: SeedRefs): LinkSeed[] =>
  (menu ?? []).flatMap((item) => {
    const link = toLinkSeed(item, refs);
    return link === null ? [] : [link];
  });

const captureResume = async (
  { files, leftOut, payload }: Reading,
  resume: SiteSetting['resume']
): Promise<null | string> => {
  const id = storedId(resume);
  if (id === '') {
    return null;
  }
  const { docs } = await payload.find({ collection: 'resume-files', ...withId(id) });
  const upload = docs[0];
  if (upload === undefined) {
    leftOut.push('site settings: the Resume: its upload is gone');
    return null;
  }
  const bytes = await readUpload(payload, payload.collections['resume-files'].config, upload);
  return files.addAs(bytes, RESUME_FILE);
};

const captureSiteSettings = async (reading: Reading): Promise<SiteSettingsSeed> => {
  const settings = await findPublishedSiteSettings(reading.payload);
  if (settings === null) {
    throw new Error(
      'No Site settings have been published, and a Seed cannot be without them. ' +
        'Publish them in the admin and capture again.'
    );
  }
  const { description, name, socials, tagline, title } = settings;
  return {
    description,
    footerMenu: captureMenu(settings.footerMenu, refsFor(reading, 'site settings footer menu')),
    headerMenu: captureMenu(settings.headerMenu, refsFor(reading, 'site settings header menu')),
    name,
    repoUrl: orNull(settings.repoUrl),
    resume: await captureResume(reading, settings.resume),
    socials: {
      bluesky: orNull(socials.bluesky),
      github: socials.github,
      linkedin: socials.linkedin,
    },
    tagline,
    title,
  };
};

/** The services in the order the site shows them; a record's position is its order. */
const captureServices = async (payload: Payload): Promise<ServiceSeed[]> => {
  const { docs } = await payload.find({
    collection: 'services',
    depth: 0,
    pagination: false,
    sort: 'order',
  });
  return docs.map(({ credibility, deliverables, name, pitch, slug }) => ({
    credibility,
    deliverables,
    name,
    pitch,
    slug,
  }));
};

const capturePost = async (reading: Reading, post: Post): Promise<PostSeed> => ({
  body: await toSeedText(post.body, refsFor(reading, `post ${post.slug}`)),
  excerpt: orNull(post.excerpt),
  publishedAt: post.publishedAt,
  slug: post.slug,
  tags: post.tags ?? [],
  title: post.title,
});

/** The published posts, by slug so that a new one changes one place in the file. */
const capturePosts = async (reading: Reading): Promise<PostSeed[]> => {
  const { docs } = await reading.payload.find({
    collection: 'posts',
    depth: 0,
    pagination: false,
    sort: 'slug',
    where: { status: { equals: 'published' } },
  });
  const posts: PostSeed[] = [];
  for (const post of docs) {
    posts.push(await capturePost(reading, post));
  }
  return posts;
};

/**
 * Reads what `payload`'s database publishes, as a Seed. `known` is what the
 * Seed's `files` directory holds now — the name of each file by the
 * fingerprint of its bytes — so that a file it already has keeps its name.
 */
export const captureSeed = async (
  payload: Payload,
  known: ReadonlyMap<string, string> = new Map()
): Promise<Captured> => {
  const served = await findPublishedPages(payload);
  const reading: Reading = {
    files: captureFiles(known),
    leftOut: [],
    payload,
    pictures: new Map(),
    slugs: new Map(served.map(({ id, slug }) => [id, slug])),
  };
  const pages = [];
  // One record at a time, so that what is left out is reported in a steady order.
  for (const page of served) {
    pages.push(await capturePage(page, refsFor(reading, `page ${page.slug}`)));
  }
  const content = parseSeed({
    pages,
    posts: await capturePosts(reading),
    services: await captureServices(payload),
    siteSettings: await captureSiteSettings(reading),
  });
  const files = reading.files.all();
  const named = filesNamedBy(content);
  if (named.length !== files.size || named.some((name) => !files.has(name))) {
    throw new Error('Capture collected files that do not match the ones the Seed names.');
  }
  return { content, files, leftOut: reading.leftOut };
};
