import type { Metadata } from 'next';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PostBody } from '@/components/blog/post-body';
import { getPostBySlug, listPublishedPosts } from '@/lib/repositories/posts';
import { siteConfig } from '@/lib/site-config';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const posts = await listPublishedPosts();
    return posts.map((post) => ({ slug: post.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return { title: 'command not found' };
  }
  return { description: post.excerpt ?? undefined, title: post.title };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    notFound();
  }
  const all = await listPublishedPosts();
  const index = all.findIndex((p) => p.slug === post.slug);
  const newer = index > 0 ? all[index - 1] : undefined;
  const older = index >= 0 ? all[index + 1] : undefined;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    author: { '@type': 'Person', name: siteConfig.name },
    datePublished: post.publishedAt,
    description: post.excerpt ?? undefined,
    headline: post.title,
    url: `${siteConfig.url}/blog/${post.slug}`,
  };
  return (
    <article className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <p className="font-mono text-sm text-fg-muted">
        <span className="text-phosphor">$</span> cat ./blog/{slug}.mdx
      </p>
      <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight sm:text-4xl">
        # {post.title}
      </h1>
      <p className="mt-3 flex flex-wrap gap-x-4 font-mono text-xs text-fg-muted">
        <time dateTime={post.publishedAt}>{post.publishedAt.slice(0, 10)}</time>
        {typeof post.readTime === 'number' ? (
          <span>{post.readTime} min read</span>
        ) : null}
        {(post.tags ?? []).map((tag) => (
          <span className="text-phosphor" key={tag}>
            #{tag}
          </span>
        ))}
      </p>
      <PostBody body={post.body} />
      <nav
        aria-label="Adjacent posts"
        className="mt-12 flex flex-wrap justify-between gap-4 border-t border-edge pt-6 font-mono text-sm"
      >
        {older ? (
          <Link
            className="text-fg-muted transition-colors hover:text-phosphor"
            href={`/blog/${older.slug}`}
          >
            ← {older.title}
          </Link>
        ) : (
          <span />
        )}
        {newer ? (
          <Link
            className="text-fg-muted transition-colors hover:text-phosphor"
            href={`/blog/${newer.slug}`}
          >
            {newer.title} →
          </Link>
        ) : null}
      </nav>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
        type="application/ld+json"
      />
    </article>
  );
}
