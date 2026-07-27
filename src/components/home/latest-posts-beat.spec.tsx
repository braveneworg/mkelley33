/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { LatestPostsBeat } from '@/components/home/latest-posts-beat';
import { makePost } from '@/test/make-post';

describe('LatestPostsBeat', () => {
  it('renders a link per post', () => {
    const posts = [
      makePost({ slug: 'one', title: 'First Post' }),
      makePost({ slug: 'two', title: 'Second Post' }),
    ];
    render(<LatestPostsBeat posts={posts} />);
    expect(screen.getByText('tail -3 ./blog')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /First Post/ })).toHaveAttribute('href', '/blog/one');
    expect(screen.getByRole('link', { name: /Second Post/ })).toHaveAttribute('href', '/blog/two');
  });

  it('renders an empty-state line with no posts', () => {
    render(<LatestPostsBeat posts={[]} />);
    expect(screen.getByText(/no posts yet/)).toBeInTheDocument();
  });
});
