/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import { ButtonLink } from '@/components/ui/button-link';
import { trackEvent } from '@/lib/analytics';

export const QuoteCta = ({ service }: { service: string }) => (
  <ButtonLink
    className="mt-5"
    href={`/contact?reason=services&service=${service}`}
    onClick={() => trackEvent('request_quote_click', { service })}
  >
    Request a quote →
  </ButtonLink>
);
