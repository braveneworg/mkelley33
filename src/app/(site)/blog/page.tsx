/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { PostList } from '@/components/blog/post-list';
import { listPublishedPosts } from '@/lib/repositories/posts';

import type { Metadata } from 'next';

export const revalidate = 300;

export const metadata: Metadata = {
  description:
    'Technical writing on React, Next.js, TypeScript, Node.js, and AI-assisted engineering.',
  title: 'blog',
};

export default async function BlogIndexPage() {
  const posts = await listPublishedPosts();
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <p className="text-fg-muted font-mono text-sm">
        <span aria-hidden="true" className="text-phosphor">
          $
        </span>{' '}
        ls ./blog
      </p>
      <h1 className="mt-3 font-mono text-3xl font-bold tracking-tight">
        <span aria-hidden="true"># </span>blog
      </h1>
      <div className="mt-10">
        <PostList posts={posts} />
      </div>
    </section>
  );
}
