/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { contactSchema } from '@/lib/validation/contact';

const valid = {
  email: 'a@b.com',
  message: 'I need help with an AI enablement rollout.',
  name: 'Ada',
  reason: 'general' as const,
  requestedServices: [],
  turnstileToken: 'tok',
  website: '',
};

describe('contactSchema', () => {
  it('accepts a valid submission', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an invalid email and a short message', () => {
    expect(contactSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, message: 'hi' }).success).toBe(false);
  });

  it('requires at least one service when reason is services', () => {
    const result = contactSchema.safeParse({ ...valid, reason: 'services' });
    expect(result.success).toBe(false);
    const ok = contactSchema.safeParse({
      ...valid,
      reason: 'services',
      requestedServices: ['ai-enablement'],
    });
    expect(ok.success).toBe(true);
  });

  it('rejects a filled honeypot', () => {
    expect(contactSchema.safeParse({ ...valid, website: 'spam.example' }).success).toBe(false);
  });
});
