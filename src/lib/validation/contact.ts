/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { z } from 'zod';

export const CONTACT_REASONS = [
  'services',
  'general',
  'speaking-writing',
  'mentoring',
  'other',
] as const;

export type ContactReason = (typeof CONTACT_REASONS)[number];

/**
 * A Map rather than a `Record`, read through {@link labelForReason} rather
 * than indexed at each call site. Every consumer previously did a computed
 * member access on a plain object; one total accessor keeps the lookup in a
 * single place and gives callers a `string` instead of a value the type
 * system merely promises is present.
 */
const CONTACT_REASON_LABELS = new Map<ContactReason, string>([
  ['general', 'general inquiry'],
  ['mentoring', 'mentoring'],
  ['other', 'other'],
  ['services', 'request services'],
  ['speaking-writing', 'speaking & writing'],
]);

/** Human-readable label for a reason, falling back to the raw value. */
export const labelForReason = (reason: ContactReason): string =>
  CONTACT_REASON_LABELS.get(reason) ?? reason;

export const contactSchema = z
  .object({
    email: z.email('enter a valid email').max(254),
    message: z
      .string()
      .trim()
      .min(10, 'a little more detail — 10 characters minimum')
      .max(5000, 'keep it under 5000 characters'),
    name: z.string().trim().min(1, 'name is required').max(120),
    reason: z.enum(CONTACT_REASONS),
    requestedServices: z.array(z.string().min(1)).max(5),
    turnstileToken: z.string().min(1, 'verification incomplete — give it a beat and retry'),
    website: z.literal(''),
  })
  .superRefine((data, ctx) => {
    if (data.reason === 'services' && data.requestedServices.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'select at least one service',
        path: ['requestedServices'],
      });
    }
  });

export type ContactFormValues = z.infer<typeof contactSchema>;
