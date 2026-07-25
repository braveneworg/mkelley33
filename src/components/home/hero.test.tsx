import { render, screen } from '@testing-library/react';

import { Hero } from '@/components/home/hero';

describe('Hero', () => {
  it('renders the whoami prompt and name', () => {
    render(<Hero />);
    expect(screen.getByText('$ whoami')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Michaux Kelley' }),
    ).toBeInTheDocument();
  });

  it('renders both CTAs', () => {
    render(<Hero />);
    expect(
      screen.getByRole('link', { name: /read the blog/i }),
    ).toHaveAttribute('href', '/blog');
    expect(screen.getByRole('link', { name: /work with me/i })).toHaveAttribute(
      'href',
      '/contact',
    );
  });
});
