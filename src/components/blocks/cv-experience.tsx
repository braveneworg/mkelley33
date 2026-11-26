/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CvSection } from '@/components/blocks/cv-section';
import { CvText } from '@/components/blocks/cv-text';
import { wordsOfText } from '@/lib/pages/text-words';
import type { CvExperienceBlock } from '@/payload-types';

/** `Org · Place · 2021–present`, without the place when the owner left it out. */
const byline = (parts: (null | string | undefined)[]): string =>
  parts.filter((part) => Boolean(part)).join(' · ');

export const CvExperience = ({ block: { entries, heading } }: { block: CvExperienceBlock }) => (
  <CvSection heading={heading}>
    <ol className="mt-3 space-y-8">
      {entries.map(({ bullets, end, id, location, org, role, start }) => (
        <li key={id ?? `${role}-${org}-${start}`}>
          <h3 className="text-fg font-mono text-base font-bold">{role}</h3>
          <p className="text-fg-muted mt-1 font-mono text-sm">
            {byline([org, location, `${start}–${end}`])}
          </p>
          {bullets && bullets.length > 0 ? (
            <ul className="text-fg mt-3 space-y-2 text-sm leading-relaxed">
              {bullets.map(({ id: bulletId, text }) => (
                <li className="flex gap-2" key={bulletId ?? wordsOfText(text)}>
                  <span aria-hidden="true" className="text-phosphor print:text-black">
                    ▸
                  </span>
                  <CvText data={text} />
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  </CvSection>
);
