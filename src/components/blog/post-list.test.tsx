import { render, screen } from '@testing-library/react';

import { PostList } from '@/components/blog/post-list';
import { makePost } from '@/test/make-post';

describe('PostList', () => {
  it('renders a link, date, read time, and excerpt per post', () => {
    const post = makePost({
      excerpt: 'How to build a blog.',
      readTime: 4,
      slug: 'create-a-nextjs-blog',
      title: 'How to create a Next.js blog using MDX',
    });
    render(<PostList posts={[post]} />);
    expect(
      screen.getByRole('link', {
        name: /how to create a next\.js blog using mdx/i,
      }),
    ).toHaveAttribute('href', '/blog/create-a-nextjs-blog');
    expect(screen.getByText('2024-02-06')).toBeInTheDocument();
    expect(screen.getByText('4 min')).toBeInTheDocument();
    expect(screen.getByText('How to build a blog.')).toBeInTheDocument();
  });

  it('renders the empty state when there are no posts', () => {
    render(<PostList posts={[]} />);
    expect(screen.getByText(/total 0/i)).toBeInTheDocument();
  });
});
