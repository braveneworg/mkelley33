/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

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
