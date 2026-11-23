/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { missingPrivacyBlocks, PRIVACY_BLOCKS } from '@/lib/pages/privacy-page';

describe('missingPrivacyBlocks', () => {
  it('finds nothing missing when both guarded Blocks are there', () => {
    expect(missingPrivacyBlocks(['terminal', 'cookieInventory', 'managePreferences'])).toEqual([]);
  });

  it('names the cookie inventory when it is gone', () => {
    expect(missingPrivacyBlocks(['terminal', 'managePreferences'])).toEqual(['Cookie inventory']);
  });

  /** Without it a visitor has no way on the policy itself to withdraw consent. */
  it('names the manage-preferences button when it is gone', () => {
    expect(missingPrivacyBlocks(['cookieInventory'])).toEqual(['Manage preferences']);
  });

  it('names both for a Page with no Blocks', () => {
    expect(missingPrivacyBlocks([])).toEqual(['Cookie inventory', 'Manage preferences']);
  });

  it('guards exactly the two kinds ADR 0002 names', () => {
    expect(PRIVACY_BLOCKS.map(({ blockType }) => blockType)).toEqual([
      'cookieInventory',
      'managePreferences',
    ]);
  });
});
