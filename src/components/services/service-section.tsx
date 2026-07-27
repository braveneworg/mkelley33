/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { ButtonLink } from '@/components/ui/button-link';
import type { ServiceContent } from '@/lib/services-content';

export const ServiceSection = ({ service }: { service: ServiceContent }) => (
  <section className="border-edge scroll-mt-24 border-t py-10 first:border-t-0" id={service.slug}>
    <h2 className="text-phosphor font-mono text-xl font-bold">{service.slug}/</h2>
    <p className="text-fg mt-1 font-mono text-sm">{service.name}</p>
    <p className="text-fg-muted mt-4 max-w-2xl leading-relaxed">{service.pitch}</p>
    <ul className="text-fg mt-4 max-w-2xl space-y-1 text-sm">
      {service.deliverables.map((deliverable) => (
        <li className="flex gap-2" key={deliverable}>
          <span aria-hidden="true" className="text-phosphor">
            ▸
          </span>
          <span>{deliverable}</span>
        </li>
      ))}
    </ul>
    <p className="text-fg-muted mt-4 max-w-2xl font-mono text-xs">
      <span aria-hidden="true">#</span> {service.credibility}
    </p>
    <ButtonLink className="mt-5" href={`/contact?reason=services&service=${service.slug}`}>
      Request a quote →
    </ButtonLink>
  </section>
);
