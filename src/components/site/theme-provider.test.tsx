import { render, screen, waitFor } from '@testing-library/react';

import { ThemeProvider } from '@/components/site/theme-provider';

describe('ThemeProvider', () => {
  afterEach(() => {
    document.documentElement.className = '';
    window.localStorage.clear();
  });

  it('renders children', () => {
    render(
      <ThemeProvider>
        <p>child content</p>
      </ThemeProvider>,
    );
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('applies the resolved theme class through the wrapper', async () => {
    window.localStorage.setItem('theme', 'dark');
    render(
      <ThemeProvider>
        <p>themed</p>
      </ThemeProvider>,
    );
    await waitFor(() =>
      expect(document.documentElement).toHaveClass('dark'),
    );
  });
});
