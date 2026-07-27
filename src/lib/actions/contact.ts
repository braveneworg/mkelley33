/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use server';

import type { ActionResult } from '@/lib/actions/types';
import { contactNotificationEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/transport';
import { findServiceIdsBySlugs, listServices } from '@/lib/repositories/services';
import { createSubmission } from '@/lib/repositories/submissions';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { contactSchema } from '@/lib/validation/contact';

const honeypotFilled = (input: unknown): boolean =>
  typeof input === 'object' &&
  input !== null &&
  'website' in input &&
  Boolean((input as { website?: unknown }).website);

export const submitContact = async (input: unknown): Promise<ActionResult> => {
  if (honeypotFilled(input)) {
    return { success: true };
  }
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'check the highlighted fields and retry', success: false };
  }
  const data = parsed.data;
  if (!(await verifyTurnstileToken(data.turnstileToken))) {
    return {
      error: 'verification failed — give it a beat and retry',
      success: false,
    };
  }
  try {
    const requestedServiceIds = await findServiceIdsBySlugs(data.requestedServices);
    await createSubmission({
      email: data.email,
      message: data.message,
      name: data.name,
      reason: data.reason,
      requestedServiceIds,
    });
    const services = await listServices();
    const serviceNames = services
      .filter((service) => data.requestedServices.includes(service.slug))
      .map((service) => service.name);
    const email = contactNotificationEmail({
      email: data.email,
      message: data.message,
      name: data.name,
      reason: data.reason,
      serviceNames,
    });
    await sendEmail({ ...email, to: process.env.CONTACT_TO ?? 'me@mkelley33.com' });
    return { success: true };
  } catch (error) {
    console.error('submitContact failed:', error);
    return {
      error: 'something broke — email me directly at me@mkelley33.com',
      success: false,
    };
  }
};
