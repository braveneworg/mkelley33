/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { Comment } from '@/payload-types';

let counter = 0;

export const makeComment = (overrides: Partial<Comment> = {}): Comment => {
  counter += 1;
  const base: Comment = {
    authorName: `Reader ${counter}`,
    body: `Comment body ${counter}`,
    createdAt: '2024-03-01T00:00:00.000Z',
    id: `comment-${counter}`,
    parent: null,
    post: 'post-1',
    status: 'approved',
    updatedAt: '2024-03-01T00:00:00.000Z',
  };
  return { ...base, ...overrides };
};
