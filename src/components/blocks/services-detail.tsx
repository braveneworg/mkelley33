/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { BlockSection } from '@/components/blocks/block-section';
import { ServiceSection } from '@/components/services/service-section';
import { listServices } from '@/lib/repositories/services';
import type { ServicesDetailBlock } from '@/payload-types';

/** Every one of the shared Services records in full. */
export const ServicesDetail = async ({ block: { command } }: { block: ServicesDetailBlock }) => {
  const services = await listServices();
  return (
    <BlockSection command={command}>
      {services.map((service) => (
        <ServiceSection key={service.slug} service={service} />
      ))}
    </BlockSection>
  );
};
