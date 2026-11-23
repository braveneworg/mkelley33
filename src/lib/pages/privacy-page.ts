/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * What the privacy Page must always hold (docs/adr/0002). The owner edits
 * the policy's wording freely; these two Blocks are the parts a visitor's
 * rights rest on — what the site stores, and the way to withdraw consent —
 * so the Page cannot be published without them. No Payload and no React in
 * here: the collection's hook and the Seed's schema share it.
 */

/** The guarded kinds of Block, with the name the admin shows for each. */
export const PRIVACY_BLOCKS = [
  { blockType: 'cookieInventory', name: 'Cookie inventory' },
  { blockType: 'managePreferences', name: 'Manage preferences' },
] as const;

/**
 * The guarded Blocks a Page with these kinds of Block lacks, by the name
 * the admin shows — empty when the Page may be published as the privacy
 * Page.
 */
export const missingPrivacyBlocks = (blockTypes: readonly string[]): string[] =>
  PRIVACY_BLOCKS.filter(({ blockType }) => !blockTypes.includes(blockType)).map(({ name }) => name);
