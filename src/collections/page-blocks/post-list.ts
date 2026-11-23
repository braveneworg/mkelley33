/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { commandField } from '@/collections/page-blocks/fields';

import type { Block } from 'payload';

/** Every published Post, newest first — the body of the blog Page. */
export const PostListBlock: Block = {
  slug: 'postList',
  fields: [commandField()],
  interfaceName: 'PostListBlock',
  labels: { plural: 'Post lists', singular: 'Post list' },
};
