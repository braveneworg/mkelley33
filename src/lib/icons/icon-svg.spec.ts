/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { readFile } from 'node:fs/promises';

import {
  APPLE_ICON_SIZE,
  FAVICON_SIZE,
  ICON_BG,
  ICON_FG,
  ICON_SVG_SIZE,
  buildIco,
  iconSvg,
} from '@/lib/icons/icon-svg';

describe('iconSvg', () => {
  it('draws the terminal background in the design background color', () => {
    expect(iconSvg(512)).toContain(`fill="${ICON_BG}"`);
  });

  it('draws the ~/ glyph in phosphor green', () => {
    const svg = iconSvg(512);
    expect(svg).toContain(`fill="${ICON_FG}"`);
    expect(svg).toContain('>~/<');
  });

  it('sizes the canvas and viewBox to the requested size', () => {
    const svg = iconSvg(48);
    expect(svg).toContain('width="48"');
    expect(svg).toContain('height="48"');
    expect(svg).toContain('viewBox="0 0 48 48"');
  });

  it('rounds the corners on the standard variant', () => {
    expect(iconSvg(100)).toContain('rx="18"');
  });

  it('renders the maskable variant full-bleed with square corners', () => {
    expect(iconSvg(100, { maskable: true })).toContain('rx="0"');
  });
});

describe('buildIco', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
  const ico = buildIco(png, 48);

  it('writes a single-image ICO header', () => {
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(1);
  });

  it('records the image dimensions and location in the directory entry', () => {
    expect(ico.readUInt8(6)).toBe(48);
    expect(ico.readUInt8(7)).toBe(48);
    expect(ico.readUInt32LE(14)).toBe(png.length);
    expect(ico.readUInt32LE(18)).toBe(22);
  });

  it('embeds the PNG bytes verbatim after the 22-byte header', () => {
    expect(ico.subarray(22).equals(png)).toBe(true);
  });
});

describe('committed icon artifacts', () => {
  it('keeps src/app/icon.svg identical to the generator output', async () => {
    const committed = await readFile('src/app/icon.svg', 'utf8');
    expect(committed).toBe(iconSvg(ICON_SVG_SIZE));
  });

  it('keeps src/app/favicon.ico a PNG-compressed ICO at the favicon size', async () => {
    const ico = await readFile('src/app/favicon.ico');
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt8(6)).toBe(FAVICON_SIZE);
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(ico.subarray(22, 30).equals(pngSignature)).toBe(true);
  });

  it('keeps src/app/apple-icon.png a PNG at the apple-touch-icon size', async () => {
    const png = await readFile('src/app/apple-icon.png');
    expect(png.readUInt32BE(16)).toBe(APPLE_ICON_SIZE);
    expect(png.readUInt32BE(20)).toBe(APPLE_ICON_SIZE);
  });
});
