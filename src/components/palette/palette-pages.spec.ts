/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { palettePages } from '@/components/palette/palette-pages';

const page = (slug: string) => ({
  href: slug === 'home' ? '/' : `/${slug}`,
  slug,
  title: slug,
  updatedAt: '',
});

describe('palettePages', () => {
  it('lists each Page as a path to its address', () => {
    expect(palettePages([page('uses')])).toEqual([{ href: '/uses', label: './uses' }]);
  });

  it('puts home first and keeps the rest in the order given', () => {
    expect(palettePages([page('blog'), page('cv'), page('home'), page('uses')])).toEqual([
      { href: '/', label: './home' },
      { href: '/blog', label: './blog' },
      { href: '/cv', label: './cv' },
      { href: '/uses', label: './uses' },
    ]);
  });
});
