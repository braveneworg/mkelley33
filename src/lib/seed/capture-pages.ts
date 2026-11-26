/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * The Pages half of Capture: a stored Page as the Seed carries it. It is
 * `fill-pages.ts` run backwards — a link's id becomes the address of its
 * Page, an upload's id becomes a file in the Seed with its alt text — and
 * every value the owner left empty is written out as `null`.
 *
 * Each kind of Block is written out field by field, never copied whole, so
 * nothing the database adds (ids, timestamps, a field the Seed does not
 * know) can reach a file that is public. A new kind of Block does not
 * type-check here until it has a case.
 */

import { wordsOfText } from '@/lib/pages/text-words';
import { inOrder } from '@/lib/seed/in-order';
import type { BlockSeed, LinkSeed, PageSeed } from '@/lib/seed/page-seed';
import { type SeedRefs, storedId, toSeedText } from '@/lib/seed/seed-text';
import type { PictureSeed } from '@/lib/seed/seed-values';
import type { Page } from '@/payload-types';

type StoredBlock = NonNullable<Page['blocks']>[number];

/** A link as the admin stores it, in a Block or a menu. */
export interface StoredLink {
  label?: null | string;
  page?: unknown;
  url?: null | string;
}

/** A value the owner may have left empty, as the Seed writes it. */
export const orNull = (value: null | string | undefined): null | string => value || null;

/**
 * A stored link as the Seed carries it, or null when the site shows nothing
 * for it: no label, no target, or a Page visitors are not served. The last
 * is the owner's link all the same, so it is reported as left out.
 */
export const toLinkSeed = (
  link: null | StoredLink | undefined,
  refs: SeedRefs
): LinkSeed | null => {
  const label = link?.label;
  if (!link || !label) {
    return null;
  }
  if (link.page) {
    const slug = refs.pageSlug(storedId(link.page));
    if (slug === undefined) {
      refs.leftOut(`the link "${label}": its Page is not published`);
      return null;
    }
    return { label, page: slug, url: null };
  }
  return link.url ? { label, page: null, url: link.url } : null;
};

/** The picture a Block shows, or null when it shows none or it cannot be carried. */
const toPictureSeed = async (upload: unknown, refs: SeedRefs): Promise<null | PictureSeed> => {
  if (!upload) {
    return null;
  }
  const picture = await refs.picture(storedId(upload));
  if (picture === null) {
    refs.leftOut('a picture: its upload is gone, or is not a kind of picture the Seed carries');
  }
  return picture;
};

type Kind<K extends StoredBlock['blockType']> = Extract<StoredBlock, { blockType: K }>;

/** The kinds with nothing on them but, at most, a command line. */
const captureBare = (
  block: Kind<
    | 'contactForm'
    | 'cookieInventory'
    | 'managePreferences'
    | 'postList'
    | 'resumeDownload'
    | 'servicesDetail'
    | 'servicesGrid'
  >
): BlockSeed => {
  switch (block.blockType) {
    case 'contactForm':
    case 'postList':
    case 'servicesDetail':
    case 'servicesGrid':
      return { blockType: block.blockType, command: orNull(block.command) };
    case 'cookieInventory':
    case 'managePreferences':
    case 'resumeDownload':
      return { blockType: block.blockType };
    default: {
      const unknown: never = block;
      return unknown;
    }
  }
};

type CvBlock = Kind<'cvEntries' | 'cvExperience' | 'cvSkills' | 'cvSummary'>;

/**
 * The CV's own kinds. Every line of them is rich text that takes links, so
 * each goes through `toSeedText` as a Terminal's text does.
 */
const captureCv = async (block: CvBlock, refs: SeedRefs): Promise<BlockSeed> => {
  switch (block.blockType) {
    case 'cvEntries':
      return {
        blockType: 'cvEntries',
        heading: block.heading,
        items: await inOrder(block.items, async ({ detail, title }) => ({
          title: await toSeedText(title, refs),
          // A line the owner emptied still holds an empty paragraph; the site shows none.
          detail: detail && wordsOfText(detail) !== '' ? await toSeedText(detail, refs) : null,
        })),
      };
    case 'cvExperience':
      return {
        blockType: 'cvExperience',
        entries: await inOrder(
          block.entries,
          async ({ bullets, end, location, org, role, start }) => ({
            bullets: await inOrder(bullets ?? [], ({ text }) => toSeedText(text, refs)),
            end,
            location: orNull(location),
            org,
            role,
            start,
          })
        ),
        heading: block.heading,
      };
    case 'cvSkills':
      return {
        blockType: 'cvSkills',
        groups: await inOrder(block.groups, async ({ items, label }) => ({
          items: await toSeedText(items, refs),
          label,
        })),
        heading: block.heading,
      };
    case 'cvSummary':
      return {
        blockType: 'cvSummary',
        heading: block.heading,
        text: await toSeedText(block.text, refs),
      };
    default: {
      const unknown: never = block;
      return unknown;
    }
  }
};

/** The kinds that hold a list or a line the owner typed, and point at nothing. */
const captureTyped = (
  block: Exclude<StoredBlock, CvBlock | Kind<'hero' | 'picture' | 'terminal' | 'timeline'>>
): BlockSeed => {
  const command = 'command' in block ? orNull(block.command) : null;
  switch (block.blockType) {
    case 'chipList':
      return { blockType: 'chipList', chips: block.chips, command, intro: orNull(block.intro) };
    case 'definitionList':
      return {
        blockType: 'definitionList',
        command,
        heading: orNull(block.heading),
        items: block.items.map(({ description, term }) => ({
          description: orNull(description),
          term,
        })),
      };
    case 'latestPosts':
      return { blockType: 'latestPosts', command, count: block.count };
    case 'linkList':
      return {
        blockType: 'linkList',
        command,
        items: block.items.map(({ description, label, url }) => ({
          description: orNull(description),
          label,
          url: orNull(url),
        })),
      };
    case 'newsletterSignup':
      return { blockType: 'newsletterSignup', command, intro: orNull(block.intro) };
    default:
      return captureBare(block);
  }
};

/**
 * One Block as the Seed carries it, or null when there is nothing left of
 * it to carry: a Picture whose upload is gone.
 */
const captureBlock = async (block: StoredBlock, refs: SeedRefs): Promise<BlockSeed | null> => {
  switch (block.blockType) {
    case 'cvEntries':
    case 'cvExperience':
    case 'cvSkills':
    case 'cvSummary':
      return captureCv(block, refs);
    case 'hero':
      return {
        blockType: 'hero',
        command: orNull(block.command),
        primaryAction: toLinkSeed(block.primaryAction, refs),
        secondaryAction: toLinkSeed(block.secondaryAction, refs),
        summary: orNull(block.summary),
      };
    case 'picture': {
      const media = await toPictureSeed(block.media, refs);
      return media === null
        ? null
        : { blockType: 'picture', caption: orNull(block.caption), media };
    }
    case 'terminal':
      return {
        blockType: 'terminal',
        body: await toSeedText(block.body, refs),
        command: orNull(block.command),
        picture: await toPictureSeed(block.picture, refs),
        pictureStyle: block.pictureStyle,
      };
    case 'timeline':
      return {
        blockType: 'timeline',
        command: orNull(block.command),
        entries: block.entries.map(({ marker, period, title }) => ({
          marker: orNull(marker),
          period: orNull(period),
          title,
        })),
        link: toLinkSeed(block.link, refs),
      };
    default:
      return captureTyped(block);
  }
};

/** A stored Page as the Seed carries it. */
export const capturePage = async (page: Page, refs: SeedRefs): Promise<PageSeed> => {
  const blocks: BlockSeed[] = [];
  // One at a time, so that what is left out is reported in the Page's order.
  for (const block of page.blocks ?? []) {
    const captured = await captureBlock(block, refs);
    if (captured !== null) {
      blocks.push(captured);
    }
  }
  return {
    blocks,
    command: orNull(page.command),
    intro: orNull(page.intro),
    meta: { description: orNull(page.meta?.description), title: orNull(page.meta?.title) },
    slug: page.slug,
    title: page.title,
  };
};
