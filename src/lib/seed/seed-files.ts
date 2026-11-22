/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * The Seed as it sits on disk: the JSON files in `seed/` and what they must
 * look like. The Seed is the public starting set of Owner content that turns
 * an empty database into the working site (see `CONTEXT.md`); `fill-seed.ts`
 * writes it into a database, and Capture will rewrite these files from the
 * live site, which is why every schema here is strict.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { z } from 'zod';

import { isHttpsUrl } from '@/lib/https-url';

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

/** A link the site renders as an `href` — the same rule the admin applies. */
const httpsUrl = z.string().refine(isHttpsUrl, { message: 'not a full https:// address' });

const SEED_FILES = 'files/';

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
 * `null` Resume leaves the download button off.
 */
export const siteSettingsSeedSchema = z.strictObject({
  description: z.string().min(1),
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

export interface Seed {
  /** Where the Seed was read from; the files it names are relative to this. */
  readonly directory: string;
  readonly services: readonly ServiceSeed[];
  readonly siteSettings: SiteSettingsSeed;
}

const SERVICES_FILE = 'services.json';
const SITE_SETTINGS_FILE = 'site-settings.json';

const readJson = (directory: string, file: string): unknown =>
  JSON.parse(readFileSync(join(directory, file), 'utf8'));

/** Reads and validates the Seed in `directory`. Throws on the first file that does not fit. */
export const loadSeed = (directory: string): Seed => ({
  directory,
  services: servicesSeedSchema.parse(readJson(directory, SERVICES_FILE)),
  siteSettings: siteSettingsSeedSchema.parse(readJson(directory, SITE_SETTINGS_FILE)),
});
