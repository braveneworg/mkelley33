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
      <p className="text-phosphor font-mono text-sm">$ ls ./blog</p>
      <h1 className="mt-3 font-mono text-3xl font-bold tracking-tight"># blog</h1>
      <div className="mt-10">
        <PostList posts={posts} />
      </div>
    </section>
  );
}
