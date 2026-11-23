/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CvSection } from '@/components/blocks/cv-section';
import type { CvEntriesBlock } from '@/payload-types';

export const CvEntries = ({ block: { heading, items } }: { block: CvEntriesBlock }) => (
  <CvSection heading={heading}>
    <ul className="mt-3 space-y-3">
      {items.map(({ detail, id, title }) => (
        <li key={id ?? title}>
          <p className={`text-fg text-sm leading-relaxed ${detail ? 'font-bold' : ''}`}>{title}</p>
          {detail ? <p className="text-fg-muted text-sm">{detail}</p> : null}
        </li>
      ))}
    </ul>
  </CvSection>
);
