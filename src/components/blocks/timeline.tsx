/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { BlockSection } from '@/components/blocks/block-section';
import { SiteLink } from '@/components/blocks/site-link';
import { resolveLink } from '@/lib/pages/links';
import type { TimelineBlock } from '@/payload-types';

export const Timeline = ({ block: { command, entries, link } }: { block: TimelineBlock }) => {
  const more = resolveLink(link);
  return (
    <BlockSection command={command}>
      <ol className="space-y-3">
        {entries.map(({ id, marker, period, title }) => (
          <li className="flex flex-wrap items-baseline gap-x-3 font-mono text-sm" key={id ?? title}>
            {marker ? <span className="text-phosphor">{marker}</span> : null}
            <span className="text-fg">{title}</span>
            {period ? <span className="text-fg-muted text-xs">{period}</span> : null}
          </li>
        ))}
      </ol>
      {more ? (
        <SiteLink
          className="text-phosphor hover:text-fg mt-6 inline-block font-mono text-sm underline underline-offset-4 transition-colors"
          link={more}
        />
      ) : null}
    </BlockSection>
  );
};
