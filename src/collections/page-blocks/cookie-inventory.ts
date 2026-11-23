/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { Block } from 'payload';

/**
 * The tables of everything the site stores or loads. It has nothing to
 * type: the rows come from the consent code, so the privacy Page cannot say
 * one thing while the site does another (docs/adr/0002).
 */
export const CookieInventoryBlock: Block = {
  slug: 'cookieInventory',
  fields: [],
  interfaceName: 'CookieInventoryBlock',
  labels: { plural: 'Cookie inventories', singular: 'Cookie inventory' },
};
