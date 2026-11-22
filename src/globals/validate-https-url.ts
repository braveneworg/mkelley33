/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { isHttpsUrl } from '@/lib/https-url';

const MESSAGE = 'Enter a full address starting with https://';

/**
 * A Payload text-field validator for a link the site renders as an `href`.
 * An empty value passes: whether the link may be left out is the field's
 * `required`. Anything else has to be a full `https://` address.
 */
export const validateHttpsUrl = (value: null | string | undefined): string | true => {
  if (value === undefined || value === null || value === '') {
    return true;
  }
  return isHttpsUrl(value) ? true : MESSAGE;
};

const REQUIRED = 'This link is required.';

/**
 * The same check for a link that must be present. Payload applies a field's
 * `required` only through its default validator, and a field with a
 * validator of its own has none — so `required: true` beside
 * `validateHttpsUrl` would let an empty link through.
 */
export const validateRequiredHttpsUrl = (value: null | string | undefined): string | true =>
  value === undefined || value === null || value.trim() === '' ? REQUIRED : validateHttpsUrl(value);
