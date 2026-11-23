/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { BlockSection } from '@/components/blocks/block-section';
import { PostList } from '@/components/blog/post-list';
import { listPublishedPosts } from '@/lib/repositories/posts';
import type { PostListBlock } from '@/payload-types';

/** Every published Post, newest first — the body of the blog Page. */
export const AllPosts = async ({ block: { command } }: { block: PostListBlock }) => {
  const posts = await listPublishedPosts();
  return (
    <BlockSection command={command}>
      <PostList posts={posts} />
    </BlockSection>
  );
};
