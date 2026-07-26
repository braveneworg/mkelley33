import Link from 'next/link';

import type { Post } from '@/payload-types';

import { TerminalSection } from '@/components/home/terminal-section';

export function LatestPostsBeat({ posts }: { posts: Post[] }) {
  return (
    <TerminalSection command="tail -3 ./blog">
      {posts.length === 0 ? (
        <p className="font-mono text-sm text-fg-muted"># no posts yet</p>
      ) : (
        <ul className="max-w-2xl space-y-4">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                className="group block"
                href={`/blog/${post.slug}`}
              >
                <span className="font-mono text-sm text-fg transition-colors group-hover:text-phosphor">
                  {post.title}
                </span>
                <span className="ml-3 font-mono text-xs text-fg-muted">
                  {post.publishedAt.slice(0, 10)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        className="mt-6 inline-block font-mono text-sm text-phosphor underline underline-offset-4 transition-colors hover:text-fg"
        href="/blog"
      >
        all posts: ./blog →
      </Link>
    </TerminalSection>
  );
}
