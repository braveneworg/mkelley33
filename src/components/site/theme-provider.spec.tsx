/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { ComponentType } from 'react';

import { render, screen, waitFor } from '@testing-library/react';

import { ThemeProvider } from '@/components/site/theme-provider';

import type { ThemeProviderProps } from 'next-themes';

const captured = vi.hoisted(() => ({ props: [] as ThemeProviderProps[] }));

vi.mock('next-themes', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const ActualProvider = actual.ThemeProvider as ComponentType<ThemeProviderProps>;
  const CapturingProvider = (props: ThemeProviderProps) => {
    captured.props.push(props);
    return <ActualProvider {...props} />;
  };
  return { ...actual, ThemeProvider: CapturingProvider };
});

describe('ThemeProvider', () => {
  beforeEach(() => {
    captured.props.length = 0;
  });

  afterEach(() => {
    document.documentElement.className = '';
    window.localStorage.clear();
  });

  it('forwards class attribute and dark default to next-themes', () => {
    render(
      <ThemeProvider>
        <p>forwarded child</p>
      </ThemeProvider>
    );
    expect(captured.props[0]).toMatchObject({
      attribute: 'class',
      defaultTheme: 'dark',
      enableSystem: true,
    });
    expect(screen.getByText('forwarded child')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <ThemeProvider>
        <p>child content</p>
      </ThemeProvider>
    );
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('applies the resolved theme class through the wrapper', async () => {
    window.localStorage.setItem('theme', 'dark');
    render(
      <ThemeProvider>
        <p>themed</p>
      </ThemeProvider>
    );
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
  });

  it('defaults to dark on first visit even when the system prefers light', async () => {
    // vitest.setup.ts stubs matchMedia with `matches: false`, so the system
    // preference resolves light — the dark class can only come from the
    // provider's own default.
    render(
      <ThemeProvider>
        <p>first visit</p>
      </ThemeProvider>
    );
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
  });
});
