/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { ComponentProps } from 'react';

import { BlockText } from '@/components/blocks/block-text';

/**
 * A line or a paragraph of the CV (`cvTextField`): the owner's words and
 * the links put in them. A link that leaves the site says so with an arrow.
 *
 * It takes its size and colour from where it is shown — a point in a list,
 * a group of skills — or from `className`. An address used as a link's
 * words has nowhere to break, so a long one is broken where the column ends
 * rather than pushing the Page wider than a phone.
 */
export const CvText = ({
  className = '',
  data,
}: {
  className?: string;
  data: ComponentProps<typeof BlockText>['data'];
}) => <BlockText arrows className={`space-y-2 wrap-anywhere ${className}`} data={data} />;
