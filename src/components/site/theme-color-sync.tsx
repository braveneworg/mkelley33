/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import { useEffect } from 'react';

import { useTheme } from 'next-themes';

// Palette values mirrored from globals.css — hex required because this
// writes a meta tag, outside CSS token reach (plan-sanctioned).
const THEME_COLORS: Record<string, string> = {
  dark: '#0b0f14',
  light: '#f4f7f5',
};

export const ThemeColorSync = () => {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color = THEME_COLORS[resolvedTheme ?? 'light'];
    if (!color) {
      return;
    }
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute('content', color);
    }
  }, [resolvedTheme]);

  return null;
};
