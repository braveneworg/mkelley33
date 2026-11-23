/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CvSection } from '@/components/blocks/cv-section';
import type { CvSkillsBlock } from '@/payload-types';

export const CvSkills = ({ block: { groups, heading } }: { block: CvSkillsBlock }) => (
  <CvSection heading={heading}>
    <dl className="mt-3 space-y-3">
      {groups.map(({ id, items, label }) => (
        <div key={id ?? label}>
          <dt className="text-fg font-mono text-sm font-bold">{label}</dt>
          <dd className="text-fg-muted mt-1 text-sm leading-relaxed">{items}</dd>
        </div>
      ))}
    </dl>
  </CvSection>
);
