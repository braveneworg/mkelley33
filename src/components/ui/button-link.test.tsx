import { render, screen } from '@testing-library/react';

import { ButtonLink } from '@/components/ui/button-link';

describe('ButtonLink', () => {
  it('renders a styled link and merges extra classes', () => {
    render(
      <ButtonLink className="mt-5" href="/services">
        Request a quote →
      </ButtonLink>,
    );
    const link = screen.getByRole('link', { name: 'Request a quote →' });
    expect(link).toHaveAttribute('href', '/services');
    expect(link).toHaveClass('border-phosphor');
    expect(link).toHaveClass('mt-5');
  });
});
