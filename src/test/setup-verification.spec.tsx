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
