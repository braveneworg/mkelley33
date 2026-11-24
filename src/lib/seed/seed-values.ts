/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * The small values every Seed file is built from. Each one is the Seed's
 * way of writing down something the database stores differently in every
 * database — a Page by its address, a picture by a file in the Seed — or a
 * rule the admin applies when the owner types the same thing.
 */

import { z } from 'zod';

import { isHttpsUrl } from '@/lib/https-url';
import { validatePageSlug } from '@/lib/pages/page-address';

export const text = z.string().min(1);

/** Every optional value is written out as `null`, so two Captures of the same content match. */
export const optionalText = text.nullable();

/** A link the site renders as an `href` — the same rule the admin applies. */
export const httpsUrl = z.string().refine(isHttpsUrl, { message: 'not a full https:// address' });

/** A Page, named by its address. */
export const pageSlug = z
  .string()
  .refine((value) => validatePageSlug(value) === true, { message: 'not a usable Page address' });

/** Where the Seed keeps the files it uploads, relative to its own directory. */
export const SEED_FILES = 'files/';

/** A file name the Seed can carry a picture under: plain characters and a kind it knows. */
const PICTURE = /^[\w-]+\.(?:webp|png|jpe?g|gif|avif)$/;

/**
 * A picture directly inside the Seed's `files` directory. The Seed uploads
 * the file this names, so it must not be able to name one anywhere else.
 */
export const isSeedPicture = (value: string): boolean =>
  value.startsWith(SEED_FILES) && PICTURE.test(value.slice(SEED_FILES.length));

/**
 * A picture as the Seed carries it: a file of its own and the alt text. The
 * Seed uploads it when it creates the record that shows it — see
 * `docs/lessons/seed/seed-inputs-stay-in-the-repo.md`.
 */
export const pictureSeedSchema = z.strictObject({
  alt: text,
  file: z.string().refine(isSeedPicture, {
    message: 'not a picture inside the Seed files directory',
  }),
});

export type PictureSeed = z.infer<typeof pictureSeedSchema>;
