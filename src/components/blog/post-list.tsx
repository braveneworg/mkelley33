import Link from 'next/link';

import type { Post } from '@/payload-types';

function isoDate(value: string): string {
  return value.slice(0, 10);
}

export function PostList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <p className="font-mono text-sm text-fg-muted">
        total 0 — nothing committed here yet.
      </p>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-edge">
      {posts.map((post) => (
        <li className="py-6 first:pt-0" key={post.id}>
          <article>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-xs text-fg-muted">
              <time dateTime={post.publishedAt}>
                {isoDate(post.publishedAt)}
              </time>
              {typeof post.readTime === 'number' ? (
                <span>{post.readTime} min</span>
              ) : null}
              {(post.tags ?? []).map((tag) => (
                <span className="text-phosphor" key={tag}>
                  #{tag}
                </span>
              ))}
            </div>
            <h2 className="mt-2 font-mono text-xl font-bold tracking-tight">
              <Link
                className="transition-colors hover:text-phosphor"
                href={`/blog/${post.slug}`}
              >
                {post.title}
              </Link>
            </h2>
            {post.excerpt ? (
              <p className="mt-2 max-w-2xl leading-relaxed text-fg-muted">
                {post.excerpt}
              </p>
            ) : null}
          </article>
        </li>
      ))}
    </ul>
  );
}
