/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CvSection } from '@/components/blocks/cv-section';
import { CvText } from '@/components/blocks/cv-text';
import { wordsOfText } from '@/lib/pages/text-words';
import type { CvEntriesBlock } from '@/payload-types';

export const CvEntries = ({ block: { heading, items } }: { block: CvEntriesBlock }) => (
  <CvSection heading={heading}>
    <ul className="mt-3 space-y-3">
      {items.map(({ detail, id, title }) => {
        // An item with a line under it is headed by its title; one without is just a line.
        const hasDetail = wordsOfText(detail) !== '';
        return (
          <li key={id ?? wordsOfText(title)}>
            <CvText
              className={`text-fg text-sm leading-relaxed ${hasDetail ? 'font-bold' : ''}`}
              data={title}
            />
            {detail && hasDetail ? (
              <CvText className="text-fg-muted text-sm" data={detail} />
            ) : null}
          </li>
        );
      })}
    </ul>
  </CvSection>
);
