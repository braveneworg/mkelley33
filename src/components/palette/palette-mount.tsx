/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import dynamic from 'next/dynamic';

import type { PaletteProps } from '@/components/palette/command-palette';

const CommandPalette = dynamic(
  () => import('@/components/palette/command-palette').then((module_) => module_.CommandPalette),
  { ssr: false }
);

export const PaletteMount = ({ pages, socials }: PaletteProps) => (
  <CommandPalette pages={pages} socials={socials} />
);
