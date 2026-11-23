/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { BlockSection } from '@/components/blocks/block-section';
import { NewsletterForm } from '@/components/newsletter/newsletter-form';
import type { NewsletterSignupBlock } from '@/payload-types';

export const NewsletterSignup = ({
  block: { command, intro },
}: {
  block: NewsletterSignupBlock;
}) => (
  <BlockSection command={command}>
    {intro ? <p className="text-fg-muted max-w-2xl leading-relaxed">{intro}</p> : null}
    <div className={intro ? 'mt-5' : undefined}>
      <NewsletterForm />
    </div>
  </BlockSection>
);
