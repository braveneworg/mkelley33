import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { NewsletterBeat } from '@/components/home/newsletter-beat';

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: () => <div data-testid="turnstile" />,
}));

describe('NewsletterBeat', () => {
  it('renders the prompt, pitch, and form', () => {
    render(<NewsletterBeat />);
    expect(screen.getByText('subscribe --newsletter')).toBeInTheDocument();
    expect(screen.getByLabelText('email')).toBeInTheDocument();
    expect(screen.getByText(/new posts, straight to your inbox/)).toBeInTheDocument();
  });
});
