/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

describe('test environment', () => {
  it('renders into jsdom with jest-dom matchers', () => {
    render(<button type="button">ok</button>);
    expect(screen.getByRole('button', { name: 'ok' })).toBeInTheDocument();
  });

  it('mocks window.matchMedia for next-themes', () => {
    const result = window.matchMedia('(prefers-color-scheme: dark)');
    expect(result.matches).toBe(false);
  });
});
