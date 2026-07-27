/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Serializes a JSON-LD payload for safe embedding in a <script> tag.
 * Escapes `<` so content containing `</script` cannot terminate the tag.
 */
export const serializeJsonLd = (value: unknown): string =>
  JSON.stringify(value).replace(/</g, '\\u003c');
