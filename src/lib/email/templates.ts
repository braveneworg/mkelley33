/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { ContactReason } from '@/lib/validation/contact';
import { CONTACT_REASON_LABELS } from '@/lib/validation/contact';

export interface EmailContent {
  subject: string;
  text: string;
}

export interface ContactNotificationInput {
  email: string;
  message: string;
  name: string;
  reason: ContactReason;
  serviceNames: string[];
}

export const contactNotificationEmail = (input: ContactNotificationInput): EmailContent => {
  const servicesLine =
    input.serviceNames.length > 0 ? `\nservices:  ${input.serviceNames.join(', ')}` : '';
  return {
    subject: `[mkelley33.com] ${CONTACT_REASON_LABELS[input.reason]} — ${input.name}`,
    text: `$ cat ./inbox/new-message\n\nfrom:      ${input.name} <${input.email}>\nreason:    ${CONTACT_REASON_LABELS[input.reason]}${servicesLine}\n\n${input.message}\n`,
  };
};

export const newsletterConfirmEmail = (confirmUrl: string): EmailContent => ({
  subject: 'confirm your subscription — mkelley33.com',
  text: `$ subscribe --newsletter\n\nalmost there — confirm your subscription:\n\n${confirmUrl}\n\nif you didn't request this, ignore this email and nothing happens.\n`,
});
