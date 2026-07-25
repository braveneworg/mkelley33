import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';

import { ThemeToggle } from '@/components/site/theme-toggle';

function renderToggle() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
  afterEach(() => {
    document.documentElement.className = '';
    window.localStorage.clear();
  });

  it('renders a button with an accessible name', async () => {
    renderToggle();
    expect(
      await screen.findByRole('button', { name: /toggle theme/i }),
    ).toBeInTheDocument();
  });

  it('toggles the dark class on <html>', async () => {
    const user = userEvent.setup();
    renderToggle();
    const button = await screen.findByRole('button', { name: /toggle theme/i });

    await user.click(button);
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));

    await user.click(button);
    await waitFor(() =>
      expect(document.documentElement).not.toHaveClass('dark'),
    );
  });
});
