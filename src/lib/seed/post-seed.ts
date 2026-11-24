/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Posts as they sit in the Seed. Only published posts are carried, so a
 * post has no status here: the fill publishes every one it creates. Read
 * time is left out as well, because a save computes it. Comments are
 * Visitor data and are never part of the Seed (see `CONTEXT.md`).
 */

import { z } from 'zod';

import { pagesLinkedInText, picturesInText, richTextSchema } from '@/lib/seed/seed-text';
import { optionalText, type PictureSeed, text } from '@/lib/seed/seed-values';

/** Lower-case words joined by hyphens — what a URL fragment can carry unescaped. */
const SLUG = /^[a-z0-9-]+$/;

const postSeedSchema = z.strictObject({
  body: richTextSchema,
  excerpt: optionalText,
  publishedAt: z.iso.datetime(),
  slug: z.string().regex(SLUG),
  tags: z.array(text),
  title: text,
});

export type PostSeed = z.infer<typeof postSeedSchema>;

/** Every post the Seed creates. */
export const postsSeedSchema = z
  .array(postSeedSchema)
  .refine((posts) => new Set(posts.map(({ slug }) => slug)).size === posts.length, {
    message: 'two posts share a slug',
  });

/** The addresses of the Pages this post links to. */
export const pagesLinkedFromPost = ({ body }: PostSeed): string[] => pagesLinkedInText(body);

/** The pictures this post shows, which the Seed uploads when it creates the post. */
export const picturesInPost = ({ body }: PostSeed): PictureSeed[] => picturesInText(body);
