/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render } from '@testing-library/react';

import { ThemeColorSync } from '@/components/site/theme-color-sync';

const themeState = { resolvedTheme: 'dark' as string | undefined };

vi.mock('next-themes', () => ({
  useTheme: () => themeState,
}));

describe('ThemeColorSync', () => {
  it('stamps the theme-color meta for the resolved theme', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.append(meta);
    themeState.resolvedTheme = 'dark';
    render(<ThemeColorSync />);
    expect(meta.getAttribute('content')).toBe('#0b0f14');
    meta.remove();
  });

  it('uses the light value when resolved light', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.append(meta);
    themeState.resolvedTheme = 'light';
    render(<ThemeColorSync />);
    expect(meta.getAttribute('content')).toBe('#f4f7f5');
    meta.remove();
  });

  it('falls back to the dark value while the theme is unresolved', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.append(meta);
    themeState.resolvedTheme = undefined;
    render(<ThemeColorSync />);
    expect(meta.getAttribute('content')).toBe('#0b0f14');
    meta.remove();
  });

  it('leaves the meta untouched for an unknown theme value', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', '#123456');
    document.head.append(meta);
    themeState.resolvedTheme = 'sepia';
    render(<ThemeColorSync />);
    expect(meta.getAttribute('content')).toBe('#123456');
    meta.remove();
  });
});
