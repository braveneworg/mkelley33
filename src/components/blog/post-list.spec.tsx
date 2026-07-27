/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

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
      })
    ).toHaveAttribute('href', '/blog/create-a-nextjs-blog');
    expect(screen.getByText('2024-02-06')).toBeInTheDocument();
    expect(screen.getByText('4 min')).toBeInTheDocument();
    expect(screen.getByText('How to build a blog.')).toBeInTheDocument();
  });

  it('renders the empty state when there are no posts', () => {
    render(<PostList posts={[]} />);
    expect(screen.getByText(/total 0/i)).toBeInTheDocument();
  });

  it('omits read time, excerpt, and tags when absent', () => {
    const post = makePost({
      excerpt: null,
      readTime: null,
      slug: 'no-metadata-post',
      tags: null,
      title: 'A post with no extras',
    });
    const { container } = render(<PostList posts={[post]} />);
    expect(screen.getByRole('link', { name: /a post with no extras/i })).toHaveAttribute(
      'href',
      '/blog/no-metadata-post'
    );
    expect(screen.getByText('2024-02-06')).toBeInTheDocument();
    expect(screen.queryByText(/min$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^#/)).not.toBeInTheDocument();
    expect(container.querySelector('article p')).not.toBeInTheDocument();
  });
});
