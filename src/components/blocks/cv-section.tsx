/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { BlockSection } from '@/components/blocks/block-section';

/** One headed part of the CV. The heading prints in black with the rest. */
export const CvSection = ({
  children,
  heading,
}: {
  children: React.ReactNode;
  heading: string;
}) => (
  <BlockSection>
    <h2 className="text-phosphor font-mono text-lg font-bold print:text-black">
      <span aria-hidden="true"># </span>
      {heading}
    </h2>
    {children}
  </BlockSection>
);
