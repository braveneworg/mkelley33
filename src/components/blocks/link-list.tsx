/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { BlockSection } from '@/components/blocks/block-section';
import { SiteLink } from '@/components/blocks/site-link';
import type { LinkListBlock } from '@/payload-types';

export const LinkList = ({ block: { command, items } }: { block: LinkListBlock }) => (
  <BlockSection command={command}>
    <ul className="max-w-2xl space-y-5">
      {items.map(({ description, id, label, url }) => (
        <li key={id ?? label}>
          {url ? (
            <SiteLink
              className="text-phosphor font-mono text-sm underline underline-offset-4"
              link={{ external: true, href: url, label }}
            />
          ) : (
            <span className="text-phosphor font-mono text-sm">{label}</span>
          )}
          {description ? (
            <p className="text-fg-muted mt-1 text-sm leading-relaxed">{description}</p>
          ) : null}
        </li>
      ))}
    </ul>
  </BlockSection>
);
