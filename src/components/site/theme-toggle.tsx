'use client';

import { useEffect, useState } from 'react';

import { useTheme } from 'next-themes';

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Intentional mount-detection guard: avoids a hydration mismatch by
    // deferring the theme-dependent disabled state until after the client
    // has mounted (the pattern next-themes' own docs recommend).

    setMounted(true);
  }, []);

  return (
    <button
      aria-label={
        !mounted
          ? 'Toggle theme'
          : resolvedTheme === 'dark'
            ? 'Switch to light theme'
            : 'Switch to dark theme'
      }
      className="text-fg-muted hover:text-phosphor transition-colors"
      disabled={!mounted}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      type="button"
    >
      ◐
    </button>
  );
};
