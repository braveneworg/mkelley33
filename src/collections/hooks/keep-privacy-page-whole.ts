/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { ValidationError } from 'payload';

import { PRIVACY_SLUG } from '@/lib/pages/page-address';
import { missingPrivacyBlocks } from '@/lib/pages/privacy-page';

import type { CollectionBeforeChangeHook } from 'payload';

/** The kind of each Block in a blocks value, whatever else the save sent. */
const blockTypesOf = (blocks: unknown): string[] =>
  Array.isArray(blocks)
    ? blocks.flatMap((block: unknown) => {
        const blockType: unknown =
          typeof block === 'object' && block !== null && 'blockType' in block
            ? block.blockType
            : undefined;
        return typeof blockType === 'string' ? [blockType] : [];
      })
    : [];

/**
 * The privacy Page cannot be published without the cookie inventory and the
 * manage-preferences button (docs/adr/0002): one deletion in the admin
 * would otherwise take away a visitor's way to withdraw consent.
 *
 * A save may send only what changed, so the address, the status and the
 * Blocks are each read from the save first and from the stored Page second.
 * A draft is not held to it — that is where the owner rearranges the Page.
 */
export const keepPrivacyPageWhole: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const slug: unknown = data.slug ?? originalDoc?.slug;
  const status: unknown = data._status ?? originalDoc?._status;
  if (slug !== PRIVACY_SLUG || status !== 'published') {
    return data;
  }
  const missing = missingPrivacyBlocks(blockTypesOf(data.blocks ?? originalDoc?.blocks));
  if (missing.length === 0) {
    return data;
  }
  throw new ValidationError({
    errors: [
      {
        message:
          `The privacy Page cannot be published without ${missing.join(' and ')}. ` +
          'Add the Block again, or save a draft instead.',
        path: 'blocks',
      },
    ],
  });
};
