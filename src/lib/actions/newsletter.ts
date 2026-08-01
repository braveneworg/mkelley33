/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use server';

import { runFormSubmission } from '@/lib/actions/run-form-submission';
import type { ActionResult } from '@/lib/actions/types';
import { newsletterConfirmEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/transport';
import type { UpsertPendingResult } from '@/lib/repositories/subscribers';
import { upsertPendingSubscriber } from '@/lib/repositories/subscribers';
import { siteConfig } from '@/lib/site-config';
import type { NewsletterFormValues } from '@/lib/validation/newsletter';
import { newsletterSchema } from '@/lib/validation/newsletter';

/**
 * Only a genuinely new or unconfirmed address gets a link. An address that is
 * already subscribed is answered with the same uniform success as everyone
 * else, so the response cannot be used to probe who is on the list.
 */
const emailConfirmLink = async (
  values: NewsletterFormValues,
  subscriber: UpsertPendingResult
): Promise<void> => {
  if (subscriber.alreadyActive || !subscriber.rawToken) {
    return;
  }
  const confirmUrl = `${siteConfig.url}/newsletter/confirm?token=${subscriber.rawToken}`;
  await sendEmail({ ...newsletterConfirmEmail(confirmUrl), to: values.email });
};

export const subscribeNewsletter = async (input: unknown): Promise<ActionResult> =>
  runFormSubmission({
    failureError: 'something broke — retry in a bit',
    input,
    invalidInputError: 'enter a valid email',
    label: 'subscribeNewsletter',
    notify: emailConfirmLink,
    persist: (values) => upsertPendingSubscriber(values.email),
    schema: newsletterSchema,
  });
