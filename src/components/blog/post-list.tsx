import Link from 'next/link';

import type { Post } from '@/payload-types';

const isoDate = (value: string): string => value.slice(0, 10);

export const PostList = ({ posts }: { posts: Post[] }) => {
  if (posts.length === 0) {
    return <p className="text-fg-muted font-mono text-sm">total 0 — nothing committed here yet.</p>;
  }
  return (
    <ul className="divide-edge flex flex-col divide-y">
      {posts.map((post) => (
        <li className="py-6 first:pt-0" key={post.id}>
          <article>
            <div className="text-fg-muted flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-xs">
              <time dateTime={post.publishedAt}>{isoDate(post.publishedAt)}</time>
              {typeof post.readTime === 'number' ? <span>{post.readTime} min</span> : null}
              {(post.tags ?? []).map((tag) => (
                <span className="text-phosphor" key={tag}>
                  <span aria-hidden="true">#</span>
                  {tag}
                </span>
              ))}
            </div>
            <h2 className="mt-2 font-mono text-xl font-bold tracking-tight">
              <Link className="hover:text-phosphor transition-colors" href={`/blog/${post.slug}`}>
                {post.title}
              </Link>
            </h2>
            {post.excerpt ? (
              <p className="text-fg-muted mt-2 max-w-2xl leading-relaxed">{post.excerpt}</p>
            ) : null}
          </article>
        </li>
      ))}
    </ul>
  );
};
