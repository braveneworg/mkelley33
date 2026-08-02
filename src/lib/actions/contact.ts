/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use server';

import { runFormSubmission } from '@/lib/actions/run-form-submission';
import type { ActionResult } from '@/lib/actions/types';
import { contactNotificationEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/transport';
import { findServiceIdsBySlugs, listServices } from '@/lib/repositories/services';
import { createSubmission } from '@/lib/repositories/submissions';
import type { ContactFormValues } from '@/lib/validation/contact';
import { contactSchema } from '@/lib/validation/contact';

/**
 * Stores the submission and resolves the requested slugs to display names for
 * the notification. Reading the names here rather than in the notification
 * keeps a repository failure on the "the submission did not land" side of the
 * pipeline, where the user is told to retry.
 */
const persistSubmission = async (values: ContactFormValues): Promise<string[]> => {
  const requestedServiceIds = await findServiceIdsBySlugs(values.requestedServices);
  await createSubmission({
    email: values.email,
    message: values.message,
    name: values.name,
    reason: values.reason,
    requestedServiceIds,
  });
  const services = await listServices();
  return services
    .filter((service) => values.requestedServices.includes(service.slug))
    .map((service) => service.name);
};

const emailOwner = async (values: ContactFormValues, serviceNames: string[]): Promise<void> => {
  const email = contactNotificationEmail({
    email: values.email,
    message: values.message,
    name: values.name,
    reason: values.reason,
    serviceNames,
  });
  await sendEmail({ ...email, to: process.env.CONTACT_TO ?? 'me@mkelley33.com' });
};

export const submitContact = async (input: unknown): Promise<ActionResult> =>
  runFormSubmission({
    failureError: 'something broke — email me directly at me@mkelley33.com',
    input,
    invalidInputError: 'check the highlighted fields and retry',
    label: 'submitContact',
    notify: emailOwner,
    persist: persistSubmission,
    schema: contactSchema,
  });
