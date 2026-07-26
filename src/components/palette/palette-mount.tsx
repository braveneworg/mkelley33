'use client';

import dynamic from 'next/dynamic';

const CommandPalette = dynamic(
  () =>
    import('@/components/palette/command-palette').then(
      (module_) => module_.CommandPalette,
    ),
  { ssr: false },
);

export function PaletteMount() {
  return <CommandPalette />;
}
