import { render, screen } from '@testing-library/react';

import NotFound from '@/app/(site)/not-found';

describe('NotFound', () => {
  it('renders the command-not-found heading', () => {
    render(<NotFound />);
    expect(
      screen.getByRole('heading', { level: 1, name: /command not found/i })
    ).toBeInTheDocument();
  });

  it('offers a way home', () => {
    render(<NotFound />);
    expect(screen.getByRole('link', { name: 'cd ~' })).toHaveAttribute('href', '/');
  });
});
