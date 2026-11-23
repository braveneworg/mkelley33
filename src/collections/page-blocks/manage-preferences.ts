/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { Block } from 'payload';

/**
 * The button that reopens the cookie form — the visitor's way to withdraw
 * consent. It has nothing to type, so no edit can reword it away
 * (docs/adr/0002).
 */
export const ManagePreferencesBlock: Block = {
  slug: 'managePreferences',
  fields: [],
  interfaceName: 'ManagePreferencesBlock',
  labels: { plural: 'Manage preferences buttons', singular: 'Manage preferences' },
};
