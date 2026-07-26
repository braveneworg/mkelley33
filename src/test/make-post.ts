import type { Post } from '@/payload-types';

let counter = 0;

export function makePost(overrides: Partial<Post> = {}): Post {
  counter += 1;
  const base: Post = {
    body: {
      root: {
        children: [
          {
            children: [{ text: 'body text', type: 'text', version: 1 }],
            direction: null,
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
          },
        ],
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    } as Post['body'],
    createdAt: '2024-01-01T00:00:00.000Z',
    excerpt: 'An excerpt.',
    id: `post-${counter}`,
    publishedAt: '2024-02-06T00:00:00.000Z',
    readTime: 3,
    slug: `post-${counter}`,
    status: 'published',
    tags: ['nextjs', 'typescript'],
    title: `Post ${counter}`,
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
  return { ...base, ...overrides };
}
