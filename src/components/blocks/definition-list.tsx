/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { BlockSection } from '@/components/blocks/block-section';
import type { DefinitionListBlock } from '@/payload-types';

export const DefinitionList = ({
  block: { command, heading, items },
}: {
  block: DefinitionListBlock;
}) => (
  <BlockSection command={command}>
    {heading ? <h2 className="text-phosphor font-mono text-lg font-bold">{heading}</h2> : null}
    <dl className={`max-w-2xl space-y-3 ${heading ? 'mt-4' : ''}`}>
      {items.map(({ description, id, term }) => (
        <div key={id ?? term}>
          <dt className="text-fg font-mono text-sm">{term}</dt>
          {description ? <dd className="text-fg-muted text-sm">{description}</dd> : null}
        </div>
      ))}
    </dl>
  </BlockSection>
);
