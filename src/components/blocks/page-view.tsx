/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { PageHeading } from '@/components/blocks/page-heading';
import { type PageBlock, RenderBlocks } from '@/components/blocks/render-blocks';
import type { Page } from '@/payload-types';

/** The kinds that make a Page a document: narrow, and laid out to print. */
const DOCUMENT_BLOCKS: ReadonlySet<PageBlock['blockType']> = new Set([
  'cvEntries',
  'cvExperience',
  'cvSkills',
  'cvSummary',
]);

/**
 * A whole Page: its heading, then its Blocks.
 *
 * A Page that opens with a Hero has no separate heading — the Hero is it.
 * A Page holding CV Blocks is shown as a document: one narrow column, which
 * `.cv-document` in `globals.css` widens again for paper.
 */
export const PageView = ({ page: { blocks, command, intro, title } }: { page: Page }) => {
  const all = blocks ?? [];
  const opensWithHero = all[0]?.blockType === 'hero';
  const isDocument = all.some(({ blockType }) => DOCUMENT_BLOCKS.has(blockType));
  return (
    <div
      className={isDocument ? 'cv-document pb-10 *:max-w-3xl' : opensWithHero ? undefined : 'pb-10'}
    >
      {opensWithHero ? null : (
        <PageHeading
          command={command}
          intro={intro}
          title={title}
          variant={isDocument ? 'document' : 'standard'}
        />
      )}
      <RenderBlocks blocks={all} />
    </div>
  );
};
