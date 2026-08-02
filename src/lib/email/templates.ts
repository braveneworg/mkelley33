/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { ContactReason } from '@/lib/validation/contact';
import { labelForReason } from '@/lib/validation/contact';

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
    subject: `[mkelley33.com] ${labelForReason(input.reason)} — ${input.name}`,
    text: `$ cat ./inbox/new-message\n\nfrom:      ${input.name} <${input.email}>\nreason:    ${labelForReason(input.reason)}${servicesLine}\n\n${input.message}\n`,
  };
};

export interface CommentNotificationInput {
  /** `''` means the commenter left the optional field empty. */
  authorEmail: string;
  authorName: string;
  body: string;
  moderateUrl: string;
  postTitle: string;
}

export const commentNotificationEmail = (input: CommentNotificationInput): EmailContent => {
  const from =
    input.authorEmail === ''
      ? `${input.authorName} (email not provided)`
      : `${input.authorName} <${input.authorEmail}>`;
  return {
    subject: `[mkelley33.com] new comment on "${input.postTitle}" — ${input.authorName}`,
    text: `$ cat ./inbox/new-comment\n\nfrom:      ${from}\npost:      ${input.postTitle}\n\n${input.body}\n\nmoderate:  ${input.moderateUrl}\n`,
  };
};

export const newsletterConfirmEmail = (confirmUrl: string): EmailContent => ({
  subject: 'confirm your subscription — mkelley33.com',
  text: `$ subscribe --newsletter\n\nalmost there — confirm your subscription:\n\n${confirmUrl}\n\nif you didn't request this, ignore this email and nothing happens.\n`,
});
