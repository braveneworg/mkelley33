/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';

import { ThemeToggle } from '@/components/site/theme-toggle';

const renderToggle = () =>
  render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ThemeToggle />
    </ThemeProvider>
  );

describe('ThemeToggle', () => {
  afterEach(() => {
    document.documentElement.className = '';
    window.localStorage.clear();
  });

  it('renders a button with an accessible name', async () => {
    renderToggle();
    expect(
      await screen.findByRole('button', { name: /switch to (light|dark) theme/i })
    ).toBeInTheDocument();
  });

  it('labels the toggle with the destination theme', async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <ThemeToggle />
      </ThemeProvider>
    );
    // Resolved dark must advertise the opposite direction — pins the ternary.
    expect(
      await screen.findByRole('button', { name: 'Switch to light theme' })
    ).toBeInTheDocument();
  });

  it('toggles the dark class on <html>', async () => {
    const user = userEvent.setup();
    renderToggle();
    const button = await screen.findByRole('button', { name: /switch to (light|dark) theme/i });

    await user.click(button);
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));

    await user.click(button);
    await waitFor(() => expect(document.documentElement).not.toHaveClass('dark'));
  });
});
