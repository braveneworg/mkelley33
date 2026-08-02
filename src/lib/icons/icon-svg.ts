/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/** Terminal background — matches `background_color`/`theme_color` in the manifest. */
export const ICON_BG = '#0b0f14';
/** Phosphor green used for the `~/` glyph. */
export const ICON_FG = '#46e08a';

/** Intrinsic size of the committed `src/app/icon.svg` (vector — browsers scale it). */
export const ICON_SVG_SIZE = 512;
/** Raster size embedded in `src/app/favicon.ico`. */
export const FAVICON_SIZE = 48;
/** apple-touch-icon size; iOS applies its own corner mask, so it renders full-bleed. */
export const APPLE_ICON_SIZE = 180;

export interface IconSvgOptions {
  /** Full-bleed square corners for maskable/apple contexts that mask their own shape. */
  maskable?: boolean;
}

/**
 * The one place the icon design lives: a dark terminal square with a green
 * `~/` prompt. Every shipped icon — PWA PNGs, favicon, apple-touch-icon —
 * is rendered from this SVG, and the spec pins the committed artifacts to it.
 */
export const iconSvg = (size: number, { maskable = false }: IconSvgOptions = {}): string => {
  const radius = maskable ? 0 : Math.round(size * 0.18);
  const fontSize = Math.round(size * (maskable ? 0.28 : 0.34));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${ICON_BG}"/><text x="50%" y="54%" font-family="Menlo, monospace" font-size="${fontSize}" font-weight="bold" fill="${ICON_FG}" text-anchor="middle" dominant-baseline="middle">~/</text></svg>`;
};

const ICO_HEADER_BYTES = 22;

/**
 * Wraps one PNG in a single-image ICO container (ICONDIR + ICONDIRENTRY +
 * PNG bytes — valid since Windows Vista and in every current browser).
 */
export const buildIco = (png: Buffer, size: number): Buffer => {
  const header = Buffer.alloc(ICO_HEADER_BYTES);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count
  header.writeUInt8(size, 6); // width
  header.writeUInt8(size, 7); // height
  header.writeUInt8(0, 8); // palette size
  header.writeUInt8(0, 9); // reserved
  header.writeUInt16LE(1, 10); // color planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14); // image byte length
  header.writeUInt32LE(ICO_HEADER_BYTES, 18); // image offset
  return Buffer.concat([header, png]);
};
