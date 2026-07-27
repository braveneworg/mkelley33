/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: '#0b0f14',
    description:
      'Programming blog and consulting site of Michaux Kelley — full-stack AI forward deployed engineer.',
    display: 'standalone',
    icons: [
      { sizes: '192x192', src: '/icons/icon-192.png', type: 'image/png' },
      { sizes: '512x512', src: '/icons/icon-512.png', type: 'image/png' },
      {
        purpose: 'maskable',
        sizes: '512x512',
        src: '/icons/icon-512-maskable.png',
        type: 'image/png',
      },
    ],
    name: 'mkelley33',
    short_name: 'mkelley33',
    start_url: '/',
    theme_color: '#0b0f14',
  };
}
