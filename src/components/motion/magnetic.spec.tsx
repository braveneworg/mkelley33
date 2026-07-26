import { render, screen } from '@testing-library/react';

import { Magnetic } from '@/components/motion/magnetic';

describe('Magnetic', () => {
  it('renders its children', () => {
    render(
      <Magnetic>
        {}
        <a href="/blog">Read the blog →</a>
      </Magnetic>
    );
    expect(screen.getByRole('link', { name: 'Read the blog →' })).toBeInTheDocument();
  });
});
