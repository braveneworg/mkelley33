/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { commandField } from '@/collections/page-blocks/fields';

import type { Block } from 'payload';

/** The newsletter form. Its labels and messages stay in code. */
export const NewsletterSignupBlock: Block = {
  slug: 'newsletterSignup',
  fields: [commandField(), { name: 'intro', type: 'textarea' }],
  interfaceName: 'NewsletterSignupBlock',
  labels: { plural: 'Newsletter signups', singular: 'Newsletter signup' },
};
