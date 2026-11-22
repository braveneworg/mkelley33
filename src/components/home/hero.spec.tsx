/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { Hero } from '@/components/home/hero';

describe('Hero', () => {
  it('renders the whoami prompt and name', () => {
    render(<Hero name="Owner Name" tagline="a site tagline" />);
    expect(screen.getByText('$ whoami')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Owner Name' })).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    render(<Hero name="Owner Name" tagline="a site tagline" />);
    expect(screen.getByText('a site tagline')).toBeInTheDocument();
  });

  it('renders both CTAs', () => {
    render(<Hero name="Owner Name" tagline="a site tagline" />);
    expect(screen.getByRole('link', { name: /read the blog/i })).toHaveAttribute('href', '/blog');
    expect(screen.getByRole('link', { name: /work with me/i })).toHaveAttribute('href', '/contact');
  });
});
