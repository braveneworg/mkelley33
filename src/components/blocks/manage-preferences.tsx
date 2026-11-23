/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { BlockSection } from '@/components/blocks/block-section';
import { ManageCookiePreferences } from '@/components/consent/manage-cookie-preferences';

/**
 * The button that reopens the cookie form. Its wording stays in code with
 * the rest of the consent text (docs/adr/0002).
 */
export const ManagePreferences = () => (
  <BlockSection>
    <ManageCookiePreferences />
  </BlockSection>
);
