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
 * Every optional value is written out as `null` rather than left out, so
 * that two Captures of the same content produce the same file.
 */

import { z } from 'zod';

import { isHttpsUrl } from '@/lib/https-url';
import { FIXED_PAGE_SLUGS, PRIVACY_SLUG, validatePageSlug } from '@/lib/pages/page-address';
import { missingPrivacyBlocks } from '@/lib/pages/privacy-page';

const text = z.string().min(1);
const optionalText = text.nullable();

/** A link the site renders as an `href` — the same rule the admin applies. */
const httpsUrl = z.string().refine(isHttpsUrl, { message: 'not a full https:// address' });

const pageSlug = z
  .string()
  .refine((value) => validatePageSlug(value) === true, { message: 'not a usable Page address' });

/** A link to a Page, by its address, or to a full address elsewhere — one or the other. */
export const linkSeedSchema = z
  .strictObject({ label: text, page: pageSlug.nullable(), url: httpsUrl.nullable() })
  .refine(({ page, url }) => (page === null) !== (url === null), {
    message: 'a link points at a Page or at an address, exactly one of them',
  });

export type LinkSeed = z.infer<typeof linkSeedSchema>;

const SEED_FILES = 'files/';
const PICTURE = /^[\w-]+\.(?:webp|png|jpe?g)$/;

/**
 * A picture directly inside the Seed's `files` directory. The Seed uploads
 * the file this names, so it must not be able to name one anywhere else.
 */
const isSeedPicture = (value: string): boolean =>
  value.startsWith(SEED_FILES) && PICTURE.test(value.slice(SEED_FILES.length));

const pictureSeedSchema = z.strictObject({
  alt: text,
  file: z.string().refine(isSeedPicture, {
    message: 'not a picture inside the Seed files directory',
  }),
});

export type PictureSeed = z.infer<typeof pictureSeedSchema>;

/**
 * Rich text as the editor stores it: the frame Payload's own type requires,
 * and whatever the editor puts inside it.
 */
const richText = z.looseObject({
  root: z.looseObject({
    children: z.array(z.looseObject({ type: z.string(), version: z.number() })),
    direction: z.enum(['ltr', 'rtl']).nullable(),
    format: z.enum(['left', 'start', 'center', 'right', 'end', 'justify', '']),
    indent: z.number(),
    type: z.string(),
    version: z.number(),
  }),
});

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
    body: richText,
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

/** The addresses of the Pages this Page links to. */
export const pagesLinkedFrom = ({ blocks }: PageSeed): string[] =>
  blocks
    .flatMap(blockLinks)
    .flatMap((link) => (link === null || link.page === null ? [] : [link.page]));

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
