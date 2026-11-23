/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { BlockSection } from '@/components/blocks/block-section';
import type { ChipListBlock } from '@/payload-types';

export const ChipList = ({ block: { chips, command, intro } }: { block: ChipListBlock }) => (
  <BlockSection command={command}>
    {intro ? <p className="text-fg max-w-2xl leading-relaxed">{intro}</p> : null}
    <ul className={`flex max-w-3xl flex-wrap gap-2 ${intro ? 'mt-6' : ''}`}>
      {chips.map((chip) => (
        <li
          className="border-edge bg-surface text-fg-muted rounded border px-3 py-1 font-mono text-xs"
          key={chip}
        >
          {chip}
        </li>
      ))}
    </ul>
  </BlockSection>
);
