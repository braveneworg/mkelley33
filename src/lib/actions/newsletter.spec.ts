/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

/**
 * Only what is specific to this action: the subscriber it upserts, when a
 * confirm link is sent, and the messages it hands the pipeline. The pipeline
 * itself is covered once in `run-form-submission.spec.ts`.
 */

import { subscribeNewsletter } from '@/lib/actions/newsletter';
import { sendEmail } from '@/lib/email/transport';
import { upsertPendingSubscriber } from '@/lib/repositories/subscribers';
import { verifyTurnstileToken } from '@/lib/turnstile/verify';

vi.mock('@/lib/email/transport', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/lib/repositories/subscribers', () => ({
  upsertPendingSubscriber: vi.fn(),
}));
vi.mock('@/lib/turnstile/verify', () => ({
  verifyTurnstileToken: vi.fn(),
}));

const valid = { email: 'a@b.com', turnstileToken: 'tok', website: '' };

beforeEach(() => {
  vi.mocked(verifyTurnstileToken).mockResolvedValue(true);
  vi.mocked(upsertPendingSubscriber).mockResolvedValue({
    alreadyActive: false,
    rawToken: 'a'.repeat(64),
  });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('subscribeNewsletter', () => {
  it('stores a pending subscriber and emails the confirm link', async () => {
    await expect(subscribeNewsletter(valid)).resolves.toEqual({ success: true });
    expect(upsertPendingSubscriber).toHaveBeenCalledWith('a@b.com');
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining(`/newsletter/confirm?token=${'a'.repeat(64)}`),
        to: 'a@b.com',
      })
    );
  });

  it('gives the uniform response for an already-active subscriber', async () => {
    vi.mocked(upsertPendingSubscriber).mockResolvedValue({
      alreadyActive: true,
      rawToken: null,
    });
    await expect(subscribeNewsletter(valid)).resolves.toEqual({ success: true });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when the upsert produced no token', async () => {
    vi.mocked(upsertPendingSubscriber).mockResolvedValue({
      alreadyActive: false,
      rawToken: null,
    });
    await expect(subscribeNewsletter(valid)).resolves.toEqual({ success: true });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('asks for a valid email when input is invalid', async () => {
    await expect(subscribeNewsletter({ ...valid, email: 'no' })).resolves.toEqual({
      error: 'enter a valid email',
      success: false,
    });
  });

  it('asks the user to retry when the upsert throws', async () => {
    vi.mocked(upsertPendingSubscriber).mockRejectedValueOnce(new Error('db down'));
    await expect(subscribeNewsletter(valid)).resolves.toEqual({
      error: 'something broke — retry in a bit',
      success: false,
    });
  });
});
