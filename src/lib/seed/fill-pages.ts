/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * The Pages half of the fill. A Page that is missing is created, published,
 * with the pictures its Blocks show uploaded alongside it; a Page that
 * exists — published, draft or unpublished — is left exactly as it is.
 */

import { inOrder } from '@/lib/seed/in-order';
import type { BlockSeed, LinkSeed, PageSeed } from '@/lib/seed/page-seed';
import { pagesLinkedFrom } from '@/lib/seed/page-seed';
import { type StoredRefs, toStoredText } from '@/lib/seed/seed-text';
import { withPictures } from '@/lib/seed/seed-uploads';

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
 * Pages that link in a circle cannot all come first. Each is listed once,
 * where the walk first leaves it, and `fillPages` deals with the link that
 * points at a Page not yet created.
 */
export const inFillOrder = (pages: readonly PageSeed[]): PageSeed[] => {
  const bySlug = new Map(pages.map((page) => [page.slug, page]));
  const ordered: PageSeed[] = [];
  const seen = new Set<string>();
  const visit = (page: PageSeed): void => {
    if (seen.has(page.slug)) {
      return;
    }
    seen.add(page.slug);
    for (const slug of pagesLinkedFrom(page)) {
      const target = bySlug.get(slug);
      if (target !== undefined) {
        visit(target);
      }
    }
    ordered.push(page);
  };
  for (const page of pages) {
    visit(page);
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

const optionalLink = (link: LinkSeed | null, { pageIds }: StoredRefs): LinkData | undefined =>
  link === null ? undefined : toLinkData(link, pageIds);

/**
 * One Block as Payload stores it. Most kinds are stored just as the Seed has
 * them; the ones that hold a link, a picture or rich text have the Seed's
 * names turned into ids.
 */
const toBlockData = async (block: BlockSeed, refs: StoredRefs) => {
  switch (block.blockType) {
    case 'cvEntries':
      return {
        ...block,
        items: await inOrder(block.items, async ({ detail, title }) => ({
          title: await toStoredText(title, refs),
          // Awaited after the title: properties are evaluated in this order.
          detail: detail === null ? null : await toStoredText(detail, refs),
        })),
      };
    case 'cvExperience':
      return {
        ...block,
        entries: await inOrder(block.entries, async ({ bullets, org, ...entry }) => ({
          ...entry,
          org: await toStoredText(org, refs),
          // Awaited after the organisation: properties are evaluated in this order.
          bullets: await inOrder(bullets, async (text) => ({
            text: await toStoredText(text, refs),
          })),
        })),
      };
    case 'cvSkills':
      return {
        ...block,
        groups: await inOrder(block.groups, async ({ items, label }) => ({
          items: await toStoredText(items, refs),
          label,
        })),
      };
    case 'cvSummary':
      return { ...block, text: await toStoredText(block.text, refs) };
    case 'hero':
      return {
        ...block,
        primaryAction: optionalLink(block.primaryAction, refs),
        secondaryAction: optionalLink(block.secondaryAction, refs),
      };
    case 'picture':
      return { ...block, media: await refs.upload(block.media) };
    case 'terminal':
      return {
        ...block,
        // The picture beside the text first, then the ones inside it.
        picture: block.picture === null ? null : await refs.upload(block.picture),
        // Awaited after the picture: properties are evaluated in this order.
        body: await toStoredText(block.body, refs),
      };
    case 'timeline':
      return { ...block, link: optionalLink(block.link, refs) };
    default:
      return block;
  }
};

/** True when visitors are served the Page with this id. */
const isPublished = async (payload: Payload, id: string): Promise<boolean> => {
  const page = await payload.findByID({ collection: PAGES, depth: 0, draft: false, id });
  return page._status === 'published';
};

/**
 * A Page with nothing on it, unpublished. It exists so that Pages which
 * link in a circle have an id to point at; `savePage` fills it in.
 */
const createShell = async (payload: Payload, { slug, title }: PageSeed): Promise<string> => {
  const { id } = await payload.create({
    collection: PAGES,
    data: { _status: 'draft', slug, title },
    draft: true,
  });
  return id;
};

/** What one run of the fill has done so far. */
interface Run {
  /**
   * The Pages and uploads made since the first shell, or null while no
   * shell has been needed. If the run stops, these are undone together.
   */
  circle: null | { slugs: string[]; uploads: string[] };
  readonly created: Set<string>;
  readonly directory: string;
  readonly pageIds: Map<string, string>;
  readonly payload: Payload;
  /** Pages created as a shell, still waiting for their Blocks. */
  readonly shells: PageSeed[];
  uploads: number;
}

/**
 * Saves one Page with its Blocks, published, and resolves to its id and the
 * ids of the files it uploaded. The Page is a new record, or the shell made
 * for it earlier.
 */
const savePage = (
  { directory, pageIds, payload }: Pick<Run, 'directory' | 'pageIds' | 'payload'>,
  { blocks, slug, ...page }: PageSeed,
  shell?: string
): Promise<{ saved: string; uploads: string[] }> =>
  withPictures(
    payload,
    directory,
    async () =>
      shell === undefined
        ? (await findPageId(payload, slug)) !== null
        : await isPublished(payload, shell),
    async (upload) => {
      const stored = [];
      // One at a time: a Page's pictures are uploaded in the order it shows them.
      for (const block of blocks) {
        stored.push(await toBlockData(block, { pageIds, upload }));
      }
      // Published at once: the build that follows renders every Page from them.
      const data = { ...page, _status: 'published' as const, blocks: stored, slug };
      const { id } =
        shell === undefined
          ? await payload.create({ collection: PAGES, data })
          : await payload.update({ collection: PAGES, data, id: shell });
      return id;
    }
  );

/** Saves a Page — new, or the shell made for it — and records what that made. */
const saveAndRecord = async (run: Run, page: PageSeed, shell?: string): Promise<void> => {
  run.circle?.slugs.push(page.slug);
  const { saved, uploads } = await savePage(run, page, shell);
  run.pageIds.set(page.slug, saved);
  run.circle?.uploads.push(...uploads);
  run.uploads += uploads.length;
};

/**
 * Creates a Page the database lacks. One whose links all have a Page to
 * point at is created whole. One that links to a Page not yet created is in
 * a circle of links, and gets a shell: an id for the others to point at.
 */
const createMissing = async (run: Run, page: PageSeed): Promise<void> => {
  run.created.add(page.slug);
  if (pagesLinkedFrom(page).every((slug) => run.pageIds.has(slug))) {
    await saveAndRecord(run, page);
    return;
  }
  run.circle ??= { slugs: [], uploads: [] };
  run.circle.slugs.push(page.slug);
  run.pageIds.set(page.slug, await createShell(run.payload, page));
  run.shells.push(page);
};

/**
 * Undoes a run that stopped among Pages that link in a circle: removes
 * every Page made since the first shell, and the pictures uploaded for
 * them. A Page that exists is never touched again, so a shell left behind
 * would stay empty for good, and a Page left pointing at a removed shell
 * would keep a link to nowhere. Nothing made earlier can point at any of
 * these, because none of them had an id yet. The next run starts over.
 *
 * Best effort, one record at a time, and it never throws: the failure worth
 * reporting is the one that stopped the Seed.
 */
const undoCircle = async ({ circle, payload }: Run): Promise<void> => {
  for (const slug of circle?.slugs ?? []) {
    try {
      const id = await findPageId(payload, slug);
      if (id !== null) {
        await payload.delete({ collection: PAGES, id });
      }
    } catch {
      // Best effort — see above.
    }
  }
  for (const id of circle?.uploads ?? []) {
    try {
      await payload.delete({ collection: MEDIA, id });
    } catch {
      // Best effort — see above.
    }
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
  const run: Run = {
    circle: null,
    created: new Set(),
    directory,
    pageIds: new Map(),
    payload,
    shells: [],
    uploads: 0,
  };
  try {
    for (const page of inFillOrder(pages)) {
      const existing = await findPageId(payload, page.slug);
      if (existing === null) {
        await createMissing(run, page);
      } else {
        run.pageIds.set(page.slug, existing);
      }
    }
    // Every Page has an id now, so the shells can hold their links.
    for (const page of run.shells) {
      await saveAndRecord(run, page, run.pageIds.get(page.slug));
    }
  } catch (error) {
    await undoCircle(run);
    throw error;
  }
  // Reported in the Seed's own order, not the order they had to be created in.
  return {
    created: pages.filter(({ slug }) => run.created.has(slug)).map(pageLabel),
    kept: pages.filter(({ slug }) => !run.created.has(slug)).map(pageLabel),
    pageIds: run.pageIds,
    uploads: run.uploads,
  };
};
