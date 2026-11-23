/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { commandField } from '@/collections/page-blocks/fields';

import type { Block } from 'payload';

export const LATEST_POSTS_DEFAULT_COUNT = 3;

/** The newest published Posts, and a link to the rest. */
export const LatestPostsBlock: Block = {
  slug: 'latestPosts',
  fields: [
    commandField(),
    {
      name: 'count',
      type: 'number',
      defaultValue: LATEST_POSTS_DEFAULT_COUNT,
      label: 'How many',
      max: 10,
      min: 1,
      required: true,
    },
  ],
  interfaceName: 'LatestPostsBlock',
  labels: { plural: 'Latest posts', singular: 'Latest posts' },
};
