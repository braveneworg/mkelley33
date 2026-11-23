/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Link from 'next/link';

import { BlockSection } from '@/components/blocks/block-section';
import { listPublishedPosts } from '@/lib/repositories/posts';
import type { LatestPostsBlock } from '@/payload-types';

/** The newest published Posts, and the way to the rest on the blog Page. */
export const LatestPosts = async ({ block: { command, count } }: { block: LatestPostsBlock }) => {
  const posts = (await listPublishedPosts()).slice(0, count);
  return (
    <BlockSection command={command}>
      {posts.length === 0 ? (
        <p className="text-fg-muted font-mono text-sm">
          <span aria-hidden="true"># </span>no posts yet
        </p>
      ) : (
        <ul className="max-w-2xl space-y-4">
          {posts.map(({ publishedAt, slug, title }) => (
            <li key={slug}>
              <Link className="group block" href={`/blog/${slug}`}>
                <span className="text-fg group-hover:text-phosphor font-mono text-sm transition-colors">
                  {title}
                </span>
                <span className="text-fg-muted ml-3 font-mono text-xs">
                  {publishedAt.slice(0, 10)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        className="text-phosphor hover:text-fg mt-6 inline-block font-mono text-sm underline underline-offset-4 transition-colors"
        href="/blog"
      >
        all posts: ./blog →
      </Link>
    </BlockSection>
  );
};
