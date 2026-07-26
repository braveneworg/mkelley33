import Link from 'next/link';

import { TerminalSection } from '@/components/home/terminal-section';
import type { Post } from '@/payload-types';

export const LatestPostsBeat = ({ posts }: { posts: Post[] }) => (
  <TerminalSection command="tail -3 ./blog">
    {posts.length === 0 ? (
      <p className="text-fg-muted font-mono text-sm">
        <span aria-hidden="true"># </span>no posts yet
      </p>
    ) : (
      <ul className="max-w-2xl space-y-4">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link className="group block" href={`/blog/${post.slug}`}>
              <span className="text-fg group-hover:text-phosphor font-mono text-sm transition-colors">
                {post.title}
              </span>
              <span className="text-fg-muted ml-3 font-mono text-xs">
                {post.publishedAt.slice(0, 10)}
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
  </TerminalSection>
);
