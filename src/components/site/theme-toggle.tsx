'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Intentional mount-detection guard: avoids a hydration mismatch by
    // deferring the theme-dependent disabled state until after the client
    // has mounted (the pattern next-themes' own docs recommend).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <button
      aria-label="Toggle theme"
      className="text-fg-muted transition-colors hover:text-phosphor"
      disabled={!mounted}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      type="button"
    >
      ◐
    </button>
  );
}
