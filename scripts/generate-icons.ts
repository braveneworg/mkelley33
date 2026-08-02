/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { mkdir, writeFile } from 'node:fs/promises';

import sharp from 'sharp';

import {
  APPLE_ICON_SIZE,
  FAVICON_SIZE,
  ICON_SVG_SIZE,
  buildIco,
  iconSvg,
} from '@/lib/icons/icon-svg';
import type { IconSvgOptions } from '@/lib/icons/icon-svg';

const renderPng = async (size: number, options: IconSvgOptions = {}): Promise<Buffer> =>
  sharp(Buffer.from(iconSvg(size, options)))
    .png()
    .toBuffer();

const run = async (): Promise<void> => {
  await mkdir('public/icons', { recursive: true });
  await writeFile('public/icons/icon-192.png', await renderPng(192));
  await writeFile('public/icons/icon-512.png', await renderPng(512));
  await writeFile('public/icons/icon-512-maskable.png', await renderPng(512, { maskable: true }));
  await writeFile('src/app/icon.svg', iconSvg(ICON_SVG_SIZE));
  await writeFile('src/app/favicon.ico', buildIco(await renderPng(FAVICON_SIZE), FAVICON_SIZE));
  await writeFile('src/app/apple-icon.png', await renderPng(APPLE_ICON_SIZE, { maskable: true }));
  console.info('generate:icons done — public/icons/ and src/app/');
};

run().catch((error: unknown) => {
  console.error(`generate:icons failed — ${String(error)}`);
  process.exit(1);
});
