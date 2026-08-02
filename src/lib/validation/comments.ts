/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { z } from 'zod';

/**
 * Cheap spam heuristic: bodies stuffed with links are the highest-signal
 * junk that still clears Turnstile. Everything lands `pending` regardless,
 * so moderation remains the real backstop.
 */
const MAX_BODY_LINKS = 2;

const countLinks = (body: string): number => (body.match(/https?:\/\//gi) ?? []).length;

/**
 * Empty strings (not `undefined`) are the "absent" sentinel for
 * `authorEmail` and `parentId` so the schema stays a `ZodType<T, T>` over
 * the exact `defaultValues` shape `useGuardedForm` submits. The Server
 * Action normalizes `''` to `undefined` before persisting.
 */
export const commentSchema = z.object({
  authorEmail: z.union([z.literal(''), z.email('enter a valid email').max(254)]),
  authorName: z.string().trim().min(1, 'name is required').max(80),
  body: z
    .string()
    .trim()
    .min(2, 'say a little more')
    .max(2000, 'keep it under 2000 characters')
    .refine((value) => countLinks(value) <= MAX_BODY_LINKS, 'keep it to 2 links'),
  parentId: z.string().max(64),
  postId: z.string().min(1).max(64),
  turnstileToken: z.string().min(1, 'verification incomplete — give it a beat and retry'),
  website: z.literal(''),
});

export type CommentFormValues = z.infer<typeof commentSchema>;
