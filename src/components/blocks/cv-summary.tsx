/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CvSection } from '@/components/blocks/cv-section';
import { CvText } from '@/components/blocks/cv-text';
import type { CvSummaryBlock } from '@/payload-types';

export const CvSummary = ({ block: { heading, text } }: { block: CvSummaryBlock }) => (
  <CvSection heading={heading}>
    <CvText className="text-fg mt-3 leading-relaxed" data={text} />
  </CvSection>
);
