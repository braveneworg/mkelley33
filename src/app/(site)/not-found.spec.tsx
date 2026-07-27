/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

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
