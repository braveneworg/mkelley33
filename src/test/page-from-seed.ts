/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * A Page from the Seed, as a read would hand it to a component — without a
 * database. It covers the kinds of Block the Seed stores exactly as it
 * carries them; a Block that needs an upload or another Page's id only
 * exists once it has been filled into a database, so it is refused here
 * rather than guessed at.
 */

import type { PageBlock } from '@/components/blocks/render-blocks';
import type { BlockSeed, PageSeed } from '@/lib/seed/page-seed';
import type { Page } from '@/payload-types';

const toStoredBlock = (block: BlockSeed): PageBlock => {
  if (block.blockType === 'cookieInventory' || block.blockType === 'managePreferences') {
    return block;
  }
  if (block.blockType === 'terminal' && block.picture === null) {
    return { ...block, picture: null };
  }
  throw new Error(`pageFromSeed cannot stand in for this ${block.blockType} Block`);
};

export const pageFromSeed = (
  { blocks, ...page }: PageSeed,
  publishedAt = '2026-11-23T00:00:00.000Z'
): Page => ({
  ...page,
  _status: 'published',
  blocks: blocks.map(toStoredBlock),
  createdAt: publishedAt,
  id: `seed-${page.slug}`,
  updatedAt: publishedAt,
});
