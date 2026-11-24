/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Pages as they sit in the Seed. The shapes follow the Block definitions in
 * `src/collections/page-blocks/`, with two differences that make the file
 * something a person can read and Capture can rewrite:
 *
 * - a link names its Page by address (`"page": "blog"`), not by a database
 *   id, which is different in every database;
 * - a picture names a file inside the Seed (`files/headshot.webp`) and
 *   carries its alt text. The Seed uploads it when it creates the Page —
 *   see `docs/lessons/seed/seed-inputs-stay-in-the-repo.md`.
 *
 * Both hold inside a Terminal's text as well (`seed-text.ts`).
 *
 * Every optional value is written out as `null` rather than left out, so
 * that two Captures of the same content produce the same file.
 */

import { z } from 'zod';

import { FIXED_PAGE_SLUGS, PRIVACY_SLUG } from '@/lib/pages/page-address';
import { missingPrivacyBlocks } from '@/lib/pages/privacy-page';
import { pagesLinkedInText, picturesInText, richTextSchema } from '@/lib/seed/seed-text';
import {
  httpsUrl,
  optionalText,
  pageSlug,
  type PictureSeed,
  pictureSeedSchema,
  text,
} from '@/lib/seed/seed-values';

/** A link to a Page, by its address, or to a full address elsewhere — one or the other. */
export const linkSeedSchema = z
  .strictObject({ label: text, page: pageSlug.nullable(), url: httpsUrl.nullable() })
  .refine(({ page, url }) => (page === null) !== (url === null), {
    message: 'a link points at a Page or at an address, exactly one of them',
  });

export type LinkSeed = z.infer<typeof linkSeedSchema>;

const command = { command: optionalText };

const blockSeedSchema = z.discriminatedUnion('blockType', [
  z.strictObject({
    blockType: z.literal('hero'),
    ...command,
    primaryAction: linkSeedSchema.nullable(),
    secondaryAction: linkSeedSchema.nullable(),
    summary: optionalText,
  }),
  z.strictObject({
    blockType: z.literal('terminal'),
    ...command,
    body: richTextSchema,
    picture: pictureSeedSchema.nullable(),
    pictureStyle: z.enum(['plain', 'roundPortrait']),
  }),
  z.strictObject({
    blockType: z.literal('chipList'),
    ...command,
    chips: z.array(text).min(1),
    intro: optionalText,
  }),
  z.strictObject({
    blockType: z.literal('timeline'),
    ...command,
    entries: z
      .array(z.strictObject({ marker: optionalText, period: optionalText, title: text }))
      .min(1),
    link: linkSeedSchema.nullable(),
  }),
  z.strictObject({
    blockType: z.literal('linkList'),
    ...command,
    items: z
      .array(z.strictObject({ description: optionalText, label: text, url: httpsUrl.nullable() }))
      .min(1),
  }),
  z.strictObject({
    blockType: z.literal('definitionList'),
    ...command,
    heading: optionalText,
    items: z.array(z.strictObject({ description: optionalText, term: text })).min(1),
  }),
  z.strictObject({ blockType: z.literal('servicesGrid'), ...command }),
  z.strictObject({ blockType: z.literal('servicesDetail'), ...command }),
  z.strictObject({
    blockType: z.literal('latestPosts'),
    ...command,
    count: z.number().int().min(1).max(10),
  }),
  z.strictObject({ blockType: z.literal('postList'), ...command }),
  z.strictObject({ blockType: z.literal('newsletterSignup'), ...command, intro: optionalText }),
  z.strictObject({ blockType: z.literal('contactForm'), ...command }),
  z.strictObject({
    blockType: z.literal('picture'),
    caption: optionalText,
    media: pictureSeedSchema,
  }),
  z.strictObject({ blockType: z.literal('cvSummary'), heading: text, text }),
  z.strictObject({
    blockType: z.literal('cvSkills'),
    groups: z.array(z.strictObject({ items: text, label: text })).min(1),
    heading: text,
  }),
  z.strictObject({
    blockType: z.literal('cvExperience'),
    entries: z
      .array(
        z.strictObject({
          bullets: z.array(text),
          end: text,
          location: optionalText,
          org: text,
          role: text,
          start: text,
        })
      )
      .min(1),
    heading: text,
  }),
  z.strictObject({
    blockType: z.literal('cvEntries'),
    heading: text,
    items: z.array(z.strictObject({ detail: optionalText, title: text })).min(1),
  }),
  z.strictObject({ blockType: z.literal('resumeDownload') }),
  z.strictObject({ blockType: z.literal('cookieInventory') }),
  z.strictObject({ blockType: z.literal('managePreferences') }),
]);

export type BlockSeed = z.infer<typeof blockSeedSchema>;

/**
 * The Seed publishes every Page it creates, and the privacy Page cannot be
 * published without its two guarded Blocks (docs/adr/0002). Refusing it
 * here means the Seed says so before it has written anything.
 */
const holdsWhatItMust = ({ blocks, slug }: { blocks: readonly BlockSeed[]; slug: string }) =>
  slug !== PRIVACY_SLUG ||
  missingPrivacyBlocks(blocks.map(({ blockType }) => blockType)).length === 0;

const pageSeedSchema = z
  .strictObject({
    blocks: z.array(blockSeedSchema),
    command: optionalText,
    intro: optionalText,
    meta: z.strictObject({ description: optionalText, title: optionalText }),
    slug: pageSlug,
    title: text,
  })
  .refine(holdsWhatItMust, {
    message: 'the privacy Page lacks its cookie inventory or its manage-preferences button',
  });

export type PageSeed = z.infer<typeof pageSeedSchema>;

/** The links a Block carries, whichever kind it is. */
const blockLinks = (block: BlockSeed): (LinkSeed | null)[] => {
  if (block.blockType === 'hero') {
    return [block.primaryAction, block.secondaryAction];
  }
  return block.blockType === 'timeline' ? [block.link] : [];
};

/** The addresses a Block points at: its own links, and the links in its text. */
const pagesLinkedFromBlock = (block: BlockSeed): string[] => [
  ...blockLinks(block).flatMap((link) => (link === null || link.page === null ? [] : [link.page])),
  ...(block.blockType === 'terminal' ? pagesLinkedInText(block.body) : []),
];

/** The addresses of the Pages this Page links to. */
export const pagesLinkedFrom = ({ blocks }: PageSeed): string[] =>
  blocks.flatMap(pagesLinkedFromBlock);

/** The pictures a Block shows, beside its text and inside it. */
const picturesOnBlock = (block: BlockSeed): PictureSeed[] => {
  if (block.blockType === 'picture') {
    return [block.media];
  }
  if (block.blockType !== 'terminal') {
    return [];
  }
  return [...(block.picture === null ? [] : [block.picture]), ...picturesInText(block.body)];
};

/** Every picture the Page shows, which the Seed uploads when it creates the Page. */
export const picturesOnPage = ({ blocks }: PageSeed): PictureSeed[] =>
  blocks.flatMap(picturesOnBlock);

const slugsOf = (pages: readonly PageSeed[]): string[] => pages.map(({ slug }) => slug);

/**
 * Every Page the Seed creates. A database filled from it must build
 * (docs/adr/0001), so it has to carry each Fixed Page, and a link in it can
 * only point at a Page it also carries.
 */
export const pagesSeedSchema = z
  .array(pageSeedSchema)
  .refine((pages) => new Set(slugsOf(pages)).size === pages.length, {
    message: 'two Pages share an address',
  })
  .refine((pages) => FIXED_PAGE_SLUGS.every((slug) => slugsOf(pages).includes(slug)), {
    message: 'a Fixed Page is missing',
  })
  .refine(
    (pages) => pages.flatMap(pagesLinkedFrom).every((slug) => slugsOf(pages).includes(slug)),
    { message: 'a link points at a Page the Seed does not carry' }
  );
