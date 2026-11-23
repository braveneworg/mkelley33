/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * True for a full `https://` address — the one rule for a link the owner
 * types and the site renders as an `href`. The Seed's schema and the admin's
 * field validation both use it, so what one accepts the other does too, and
 * neither lets a `javascript:` address through.
 */
export const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};
