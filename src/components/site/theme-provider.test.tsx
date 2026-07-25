import { render, screen } from '@testing-library/react';

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
});
