/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { PalettePage } from '@/components/palette/command-palette';
import { HOME_SLUG } from '@/lib/pages/page-address';
import type { PageSummary } from '@/lib/repositories/pages';

/**
 * The published Pages as the command palette lists them: each as a path,
 * `./home` first and the rest in the order they were given.
 */
export const palettePages = (pages: readonly PageSummary[]): PalettePage[] =>
  [...pages]
    .sort((a, b) => Number(b.slug === HOME_SLUG) - Number(a.slug === HOME_SLUG))
    .map(({ href, slug }) => ({ href, label: `./${slug}` }));
