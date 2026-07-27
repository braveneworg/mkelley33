/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { TerminalSection } from '@/components/home/terminal-section';
import { NewsletterForm } from '@/components/newsletter/newsletter-form';

export const NewsletterBeat = () => (
  <TerminalSection command="subscribe --newsletter">
    <p className="text-fg-muted max-w-2xl leading-relaxed">
      new posts, straight to your inbox. no spam, no schedule, unsubscribe anytime.
    </p>
    <div className="mt-5">
      <NewsletterForm />
    </div>
  </TerminalSection>
);
