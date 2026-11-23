/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Link from 'next/link';

import { BlockSection } from '@/components/blocks/block-section';
import { listServices } from '@/lib/repositories/services';
import type { ServicesGridBlock } from '@/payload-types';

/** A card for each of the shared Services records, linking to its detail. */
export const ServicesGrid = async ({ block: { command } }: { block: ServicesGridBlock }) => {
  const services = await listServices();
  return (
    <BlockSection command={command}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map(({ name, slug }) => (
          <li key={slug}>
            <Link
              className="border-edge bg-surface hover:border-phosphor block h-full rounded-lg border p-4 transition-colors"
              href={`/services#${slug}`}
            >
              <span className="text-phosphor font-mono text-sm">{slug}/</span>
              <p className="text-fg-muted mt-2 text-sm leading-relaxed">{name}</p>
            </Link>
          </li>
        ))}
      </ul>
    </BlockSection>
  );
};
