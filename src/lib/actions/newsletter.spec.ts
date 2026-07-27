/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { subscribeNewsletter } from '@/lib/actions/newsletter';
import { sendEmail } from '@/lib/email/transport';
import { upsertPendingSubscriber } from '@/lib/repositories/subscribers';
import { verifyTurnstileToken } from '@/lib/turnstile';

vi.mock('@/lib/email/transport', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/lib/repositories/subscribers', () => ({
  upsertPendingSubscriber: vi
    .fn()
    .mockResolvedValue({ alreadyActive: false, rawToken: 'a'.repeat(64) }),
}));
vi.mock('@/lib/turnstile', () => ({
  verifyTurnstileToken: vi.fn().mockResolvedValue(true),
}));

const valid = { email: 'a@b.com', turnstileToken: 'tok', website: '' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('subscribeNewsletter', () => {
  it('stores a pending subscriber and emails the confirm link', async () => {
    await expect(subscribeNewsletter(valid)).resolves.toEqual({
      success: true,
    });
    expect(upsertPendingSubscriber).toHaveBeenCalledWith('a@b.com');
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining(`/newsletter/confirm?token=${'a'.repeat(64)}`),
        to: 'a@b.com',
      })
    );
  });

  it('gives the uniform response for an already-active subscriber', async () => {
    vi.mocked(upsertPendingSubscriber).mockResolvedValueOnce({
      alreadyActive: true,
      rawToken: null,
    });
    await expect(subscribeNewsletter(valid)).resolves.toEqual({
      success: true,
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('honeypot short-circuits; invalid email and failed turnstile reject', async () => {
    await expect(subscribeNewsletter({ ...valid, website: 'x' })).resolves.toEqual({
      success: true,
    });
    expect(upsertPendingSubscriber).not.toHaveBeenCalled();
    expect((await subscribeNewsletter({ ...valid, email: 'no' })).success).toBe(false);
    vi.mocked(verifyTurnstileToken).mockResolvedValueOnce(false);
    expect((await subscribeNewsletter(valid)).success).toBe(false);
  });

  it('still succeeds when the confirm email fails to send', async () => {
    vi.mocked(sendEmail).mockResolvedValueOnce(false);
    await expect(subscribeNewsletter(valid)).resolves.toEqual({
      success: true,
    });
  });
});
