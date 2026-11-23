/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Link from 'next/link';

import { TerminalSection } from '@/components/home/terminal-section';
import type { ServiceContent } from '@/lib/services-content';

export const ServicesBeat = ({ services }: { services: ServiceContent[] }) => (
  <TerminalSection command="ls ./services">
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <li key={service.slug}>
          <Link
            className="border-edge bg-surface hover:border-phosphor block h-full rounded-lg border p-4 transition-colors"
            href={`/services#${service.slug}`}
          >
            <span className="text-phosphor font-mono text-sm">{service.slug}/</span>
            <p className="text-fg-muted mt-2 text-sm leading-relaxed">{service.name}</p>
          </Link>
        </li>
      ))}
    </ul>
  </TerminalSection>
);
