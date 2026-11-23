/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * The Pages half of the fill. A Page that is missing is created, published,
 * with the pictures its Blocks show uploaded alongside it; a Page that
 * exists — published, draft or unpublished — is left exactly as it is.
 */

import path from 'node:path';

import type { BlockSeed, LinkSeed, PageSeed, PictureSeed } from '@/lib/seed/page-seed';
import { pagesLinkedFrom } from '@/lib/seed/page-seed';

import type { Payload } from 'payload';

const PAGES = 'pages';
const MEDIA = 'media';

/** How the report names a Page. */
export const pageLabel = ({ slug }: PageSeed): string => `page ${slug}`;

/** The database id of the Page at `slug`, or null when no Page has that address. */
export const findPageId = async (payload: Payload, slug: string): Promise<null | string> => {
  const { docs } = await payload.find({
    collection: PAGES,
    depth: 0,
    // The newest state, so a Page the owner has only drafted counts as theirs.
    draft: true,
    limit: 1,
    where: { slug: { equals: slug } },
  });
  return docs[0]?.id ?? null;
};

/**
 * The Pages with every Page before the ones that link to it, because a link
 * is stored as the id of its target and the target has to exist first.
 *
 * Two Pages that link to each other cannot be ordered, and the Seed refuses
 * them rather than create one with a link missing: a Page that exists is
 * never touched again, so the gap would be permanent.
 */
export const inFillOrder = (pages: readonly PageSeed[]): PageSeed[] => {
  const bySlug = new Map(pages.map((page) => [page.slug, page]));
  const ordered: PageSeed[] = [];
  const done = new Set<string>();
  const visit = (page: PageSeed, trail: readonly string[]): void => {
    if (done.has(page.slug)) {
      return;
    }
    if (trail.includes(page.slug)) {
      throw new Error(
        `the Seed's Pages link in a circle (${[...trail, page.slug].join(' → ')}), ` +
          'so none of them can be created first'
      );
    }
    for (const slug of pagesLinkedFrom(page)) {
      const target = bySlug.get(slug);
      if (target !== undefined) {
        visit(target, [...trail, page.slug]);
      }
    }
    done.add(page.slug);
    ordered.push(page);
  };
  for (const page of pages) {
    visit(page, []);
  }
  return ordered;
};

/** A stored link: the Page's id where the Seed names its address. */
export interface LinkData {
  label: string;
  page: null | string;
  url: null | string;
}

/**
 * Turns the Seed's links into stored ones. `pageIds` holds the id of every
 * Page that exists so far; a link to one that does not is a fault in the
 * fill order, not something to store as a link to nowhere.
 */
export const toLinkData = (
  { label, page, url }: LinkSeed,
  pageIds: ReadonlyMap<string, string>
): LinkData => {
  if (page === null) {
    return { label, page: null, url };
  }
  const id = pageIds.get(page);
  if (id === undefined) {
    throw new Error(`a link points at the ${page} Page, which does not exist yet`);
  }
  return { label, page: id, url: null };
};

interface FillContext {
  readonly pageIds: ReadonlyMap<string, string>;
  readonly upload: (picture: PictureSeed) => Promise<string>;
}

const optionalLink = (link: LinkSeed | null, { pageIds }: FillContext): LinkData | undefined =>
  link === null ? undefined : toLinkData(link, pageIds);

/** One Block as Payload stores it. Most kinds are stored just as the Seed has them. */
const toBlockData = async (block: BlockSeed, context: FillContext) => {
  switch (block.blockType) {
    case 'cvExperience':
      return {
        ...block,
        entries: block.entries.map(({ bullets, ...entry }) => ({
          ...entry,
          bullets: bullets.map((text) => ({ text })),
        })),
      };
    case 'hero':
      return {
        ...block,
        primaryAction: optionalLink(block.primaryAction, context),
        secondaryAction: optionalLink(block.secondaryAction, context),
      };
    case 'picture':
      return { ...block, media: await context.upload(block.media) };
    case 'terminal':
      return {
        ...block,
        picture: block.picture === null ? null : await context.upload(block.picture),
      };
    case 'timeline':
      return { ...block, link: optionalLink(block.link, context) };
    default:
      return block;
  }
};

/**
 * Tidies up after a failed Page: removes the pictures uploaded for it, so
 * the next run does not upload a second copy beside them.
 *
 * It must not delete an upload that is in use — a create can fail after it
 * has written the Page, because the version history is saved second — and
 * it must not throw: the failure worth reporting is the one that stopped
 * the Seed. See `docs/lessons/seed/a-cleanup-must-not-outrank-the-failure.md`.
 */
const removeUnusedUploads = async (
  payload: Payload,
  slug: string,
  uploads: readonly string[]
): Promise<void> => {
  try {
    if ((await findPageId(payload, slug)) !== null) {
      return;
    }
    for (const id of uploads) {
      await payload.delete({ collection: MEDIA, id });
    }
  } catch {
    // Best effort — see above.
  }
};

/** Creates one Page, published, and returns its id and how many files it uploaded. */
const createPage = async (
  payload: Payload,
  directory: string,
  { blocks, slug, ...page }: PageSeed,
  pageIds: ReadonlyMap<string, string>
): Promise<{ id: string; uploads: number }> => {
  const uploads: string[] = [];
  const upload = async ({ alt, file }: PictureSeed): Promise<string> => {
    const { id } = await payload.create({
      collection: MEDIA,
      data: { alt },
      filePath: path.resolve(directory, file),
    });
    uploads.push(id);
    return id;
  };
  try {
    const stored = [];
    // One at a time: a Page's pictures are uploaded in the order it shows them.
    for (const block of blocks) {
      stored.push(await toBlockData(block, { pageIds, upload }));
    }
    const { id } = await payload.create({
      collection: PAGES,
      // Published at once: the build that follows renders every Page from them.
      data: { ...page, _status: 'published', blocks: stored, slug },
    });
    return { id, uploads: uploads.length };
  } catch (error) {
    await removeUnusedUploads(payload, slug, uploads);
    throw error;
  }
};

export interface PagesFill {
  /** Labels of the Pages this run created. */
  readonly created: string[];
  /** Labels of the Pages that already existed and were left alone. */
  readonly kept: string[];
  /** The id of every Seed Page, created or kept, by its address. */
  readonly pageIds: ReadonlyMap<string, string>;
  /** How many files this run uploaded. */
  readonly uploads: number;
}

/** Creates the Seed's missing Pages and reports which it created and which it kept. */
export const fillPages = async (
  payload: Payload,
  directory: string,
  pages: readonly PageSeed[]
): Promise<PagesFill> => {
  const created = new Set<string>();
  const pageIds = new Map<string, string>();
  let uploads = 0;
  for (const page of inFillOrder(pages)) {
    const existing = await findPageId(payload, page.slug);
    if (existing === null) {
      const result = await createPage(payload, directory, page, pageIds);
      pageIds.set(page.slug, result.id);
      uploads += result.uploads;
      created.add(page.slug);
    } else {
      pageIds.set(page.slug, existing);
    }
  }
  // Reported in the Seed's own order, not the order they had to be created in.
  return {
    created: pages.filter(({ slug }) => created.has(slug)).map(pageLabel),
    kept: pages.filter(({ slug }) => !created.has(slug)).map(pageLabel),
    pageIds,
    uploads,
  };
};
