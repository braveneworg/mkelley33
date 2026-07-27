/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

function iconSvg(size, { maskable = false } = {}) {
  const radius = maskable ? 0 : Math.round(size * 0.18);
  const fontSize = Math.round(size * (maskable ? 0.28 : 0.34));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#0b0f14"/><text x="50%" y="54%" font-family="Menlo, monospace" font-size="${fontSize}" font-weight="bold" fill="#46e08a" text-anchor="middle" dominant-baseline="middle">~/</text></svg>`;
}

await mkdir('public/icons', { recursive: true });
await sharp(Buffer.from(iconSvg(192)))
  .png()
  .toFile('public/icons/icon-192.png');
await sharp(Buffer.from(iconSvg(512)))
  .png()
  .toFile('public/icons/icon-512.png');
await sharp(Buffer.from(iconSvg(512, { maskable: true })))
  .png()
  .toFile('public/icons/icon-512-maskable.png');
console.log('icons written to public/icons/');
