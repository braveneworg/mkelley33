/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

import { siteConfig } from '@/lib/site-config';

export const alt = 'mkelley33 — full-stack AI forward deployed engineer';
export const contentType = 'image/png';
export const size = { height: 630, width: 1200 };

export default async function Image() {
  const mono = await readFile(join(process.cwd(), 'src/assets/fonts/JetBrainsMono-Bold.ttf'));
  return new ImageResponse(
    <div
      style={{
        backgroundColor: '#0b0f14',
        color: '#d7e2e9',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'JetBrains Mono',
        height: '100%',
        justifyContent: 'center',
        padding: 80,
        width: '100%',
      }}
    >
      <div style={{ color: '#46e08a', fontSize: 36 }}>$ whoami</div>
      <div style={{ fontSize: 72, fontWeight: 700, marginTop: 24 }}>{siteConfig.name}</div>
      <div style={{ color: '#46e08a', fontSize: 38, marginTop: 16 }}>{siteConfig.tagline}</div>
      <div style={{ color: '#7d93a5', fontSize: 28, marginTop: 48 }}>mkelley33.com</div>
    </div>,
    {
      ...size,
      fonts: [{ data: mono, name: 'JetBrains Mono', style: 'normal', weight: 700 }],
    }
  );
}
