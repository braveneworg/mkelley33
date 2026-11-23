/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Suspense } from 'react';

import { BlockSection } from '@/components/blocks/block-section';
import type { ContactServiceOption } from '@/components/contact/contact-form';
import { ContactForm } from '@/components/contact/contact-form';
import { listServices } from '@/lib/repositories/services';
import type { ContactFormBlock } from '@/payload-types';

/** The contact form, offering the shared Services records to ask about. */
export const Contact = async ({ block: { command } }: { block: ContactFormBlock }) => {
  const services: ContactServiceOption[] = (await listServices()).map(({ name, slug }) => ({
    name,
    slug,
  }));
  return (
    <BlockSection command={command}>
      {/* The form reads the address's query, which suspends during prerender. */}
      <Suspense fallback={null}>
        <ContactForm services={services} />
      </Suspense>
    </BlockSection>
  );
};
