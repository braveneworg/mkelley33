import { render, screen } from '@testing-library/react';

import { Magnetic } from '@/components/motion/magnetic';

describe('Magnetic', () => {
  it('renders its children', () => {
    render(
      <Magnetic>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- plain anchor keeps this unit test decoupled from next/link */}
        <a href="/blog">Read the blog →</a>
      </Magnetic>,
    );
    expect(
      screen.getByRole('link', { name: 'Read the blog →' }),
    ).toBeInTheDocument();
  });
});
