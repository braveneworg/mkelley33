/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * The Seed as it sits on disk: the JSON files in `seed/` and what they must
 * look like. The Seed is the public starting set of Owner content that turns
 * an empty database into the working site (see `CONTEXT.md`); `fill-seed.ts`
 * writes it into a database, and Capture (`capture-seed.ts`) rewrites these
 * files from the live site, which is why every schema here is strict.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { z } from 'zod';

import {
  linkSeedSchema,
  type PageSeed,
  pagesSeedSchema,
  picturesOnPage,
} from '@/lib/seed/page-seed';
import {
  pagesLinkedFromPost,
  picturesInPost,
  type PostSeed,
  postsSeedSchema,
} from '@/lib/seed/post-seed';
import { httpsUrl, SEED_FILES } from '@/lib/seed/seed-values';

/** Lower-case words joined by hyphens — what a URL fragment can carry unescaped. */
const SLUG = /^[a-z0-9-]+$/;

const serviceSeedSchema = z.strictObject({
  credibility: z.string().min(1),
  deliverables: z.array(z.string().min(1)).min(1),
  name: z.string().min(1),
  pitch: z.string().min(1),
  slug: z.string().regex(SLUG),
});

/** The services in the order the site shows them; a record's position is its order. */
export const servicesSeedSchema = z
  .array(serviceSeedSchema)
  .refine((services) => new Set(services.map(({ slug }) => slug)).size === services.length, {
    message: 'two services share a slug',
  });

export type ServiceSeed = z.infer<typeof serviceSeedSchema>;

/** A bare file name: no separator, so it cannot leave the directory. */
const FILE_NAME = /^[\w.-]+$/;

/**
 * A PDF directly inside the Seed's `files` directory. The Seed uploads the
 * file this names, so it must not be able to name one anywhere else.
 */
const isSeedPdf = (value: string): boolean => {
  if (!value.startsWith(SEED_FILES) || !value.endsWith('.pdf')) {
    return false;
  }
  const name = value.slice(SEED_FILES.length);
  return FILE_NAME.test(name) && !name.includes('..');
};

const seedPdf = z
  .string()
  .refine(isSeedPdf, { message: 'not a PDF inside the Seed files directory' });

/**
 * The Site settings. A link that is `null` is one the site hides, and a
 * `null` Resume leaves the download button off. A menu item names its Page
 * by address, as a Block's link does.
 */
export const siteSettingsSeedSchema = z.strictObject({
  description: z.string().min(1),
  footerMenu: z.array(linkSeedSchema),
  headerMenu: z.array(linkSeedSchema),
  name: z.string().min(1),
  repoUrl: httpsUrl.nullable(),
  resume: seedPdf.nullable(),
  socials: z.strictObject({
    bluesky: httpsUrl.nullable(),
    github: httpsUrl,
    linkedin: httpsUrl,
  }),
  tagline: z.string().min(1),
  title: z.string().min(1),
});

export type SiteSettingsSeed = z.infer<typeof siteSettingsSeedSchema>;

/** Everything a Seed holds, apart from where it was read from. */
export interface SeedContent {
  readonly pages: readonly PageSeed[];
  readonly posts: readonly PostSeed[];
  readonly services: readonly ServiceSeed[];
  readonly siteSettings: SiteSettingsSeed;
}

export interface Seed extends SeedContent {
  /** Where the Seed was read from; the files it names are relative to this. */
  readonly directory: string;
}

/** The Seed's JSON files, by what each holds. */
export const SEED_JSON = {
  pages: 'pages.json',
  posts: 'posts.json',
  services: 'services.json',
  siteSettings: 'site-settings.json',
} as const;

/** The addresses a menu links to. */
const menuTargets = ({ footerMenu, headerMenu }: SiteSettingsSeed): string[] =>
  [...headerMenu, ...footerMenu].flatMap(({ page }) => (page === null ? [] : [page]));

/** The first address in `targets` that is not a Page the Seed carries. */
const strayTarget = (
  pages: readonly PageSeed[],
  targets: readonly string[]
): string | undefined => {
  const carried = new Set(pages.map(({ slug }) => slug));
  return targets.find((slug) => !carried.has(slug));
};

/**
 * Validates what the Seed's files hold. Throws on the first part that does
 * not fit, and when a menu or a post links to a Page the Seed does not
 * carry — the rules that span two files. Capture runs what it has read
 * through this before it writes, so it cannot write a Seed the fill would
 * refuse.
 */
export const parseSeed = (raw: Record<keyof SeedContent, unknown>): SeedContent => {
  const pages = pagesSeedSchema.parse(raw.pages);
  const siteSettings = siteSettingsSeedSchema.parse(raw.siteSettings);
  const posts = postsSeedSchema.parse(raw.posts);
  const fromMenu = strayTarget(pages, menuTargets(siteSettings));
  if (fromMenu !== undefined) {
    throw new Error(`a menu links to the ${fromMenu} Page, which the Seed does not carry`);
  }
  const fromPost = strayTarget(pages, posts.flatMap(pagesLinkedFromPost));
  if (fromPost !== undefined) {
    throw new Error(`a post links to the ${fromPost} Page, which the Seed does not carry`);
  }
  return { pages, posts, services: servicesSeedSchema.parse(raw.services), siteSettings };
};

const readJson = (directory: string, file: string): unknown =>
  JSON.parse(readFileSync(join(directory, file), 'utf8'));

/** Reads and validates the Seed in `directory`. */
export const loadSeed = (directory: string): Seed => ({
  ...parseSeed({
    pages: readJson(directory, SEED_JSON.pages),
    posts: readJson(directory, SEED_JSON.posts),
    services: readJson(directory, SEED_JSON.services),
    siteSettings: readJson(directory, SEED_JSON.siteSettings),
  }),
  directory,
});

/**
 * Every file the Seed uploads, as it names them (`files/headshot.webp`),
 * each once: the Resume, and the pictures its Pages and posts show.
 */
export const filesNamedBy = ({ pages, posts, siteSettings }: SeedContent): string[] => [
  ...new Set([
    ...(siteSettings.resume === null ? [] : [siteSettings.resume]),
    ...pages.flatMap(picturesOnPage).map(({ file }) => file),
    ...posts.flatMap(picturesInPost).map(({ file }) => file),
  ]),
];
