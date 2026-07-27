/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { z } from 'zod';

export const newsletterSchema = z.object({
  email: z.email('enter a valid email').max(254),
  turnstileToken: z.string().min(1, 'verification incomplete — give it a beat and retry'),
  website: z.literal(''),
});

export type NewsletterFormValues = z.infer<typeof newsletterSchema>;
