'use server';

import type { ActionResult } from '@/lib/actions/types';

import { newsletterConfirmEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/transport';
import { upsertPendingSubscriber } from '@/lib/repositories/subscribers';
import { siteConfig } from '@/lib/site-config';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { newsletterSchema } from '@/lib/validation/newsletter';

function honeypotFilled(input: unknown): boolean {
  return (
    typeof input === 'object' &&
    input !== null &&
    'website' in input &&
    Boolean((input as { website?: unknown }).website)
  );
}

export async function subscribeNewsletter(
  input: unknown,
): Promise<ActionResult> {
  if (honeypotFilled(input)) {
    return { success: true };
  }
  const parsed = newsletterSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'enter a valid email', success: false };
  }
  if (!(await verifyTurnstileToken(parsed.data.turnstileToken))) {
    return {
      error: 'verification failed — give it a beat and retry',
      success: false,
    };
  }
  try {
    const result = await upsertPendingSubscriber(parsed.data.email);
    if (!result.alreadyActive && result.rawToken) {
      const confirmUrl = `${siteConfig.url}/newsletter/confirm?token=${result.rawToken}`;
      await sendEmail({
        ...newsletterConfirmEmail(confirmUrl),
        to: parsed.data.email,
      });
    }
    return { success: true };
  } catch (error) {
    console.error('subscribeNewsletter failed:', error);
    return { error: 'something broke — retry in a bit', success: false };
  }
}
