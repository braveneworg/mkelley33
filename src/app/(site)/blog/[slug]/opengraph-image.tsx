/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

import { getPostBySlug } from '@/lib/repositories/posts';

export const alt = 'blog post — mkelley33.com';
export const contentType = 'image/png';
export const size = { height: 630, width: 1200 };

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  const mono = await readFile(join(process.cwd(), 'src/assets/fonts/JetBrainsMono-Bold.ttf'));
  const title = post?.title ?? 'command not found';
  const date = post?.publishedAt.slice(0, 10) ?? '';
  const tags = (post?.tags ?? []).map((tag) => `#${tag}`).join('  ');
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
      <div style={{ color: '#46e08a', fontSize: 32 }}>$ cat ./blog/{slug}.mdx</div>
      <div
        style={{
          fontSize: title.length > 40 ? 56 : 68,
          fontWeight: 700,
          marginTop: 28,
        }}
      >
        {title}
      </div>
      <div style={{ color: '#7d93a5', display: 'flex', fontSize: 26, gap: 32, marginTop: 40 }}>
        <span>{date}</span>
        <span style={{ color: '#46e08a' }}>{tags}</span>
      </div>
      <div style={{ color: '#7d93a5', fontSize: 24, marginTop: 48 }}>mkelley33.com</div>
    </div>,
    {
      ...size,
      fonts: [{ data: mono, name: 'JetBrains Mono', style: 'normal', weight: 700 }],
    }
  );
}
