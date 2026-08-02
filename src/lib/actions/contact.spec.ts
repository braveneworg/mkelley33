/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

/**
 * Only what is specific to this action: the repositories it writes, the
 * notification it builds, and the messages it hands the pipeline. The pipeline
 * itself — honeypot ordering, Turnstile before persistence, tolerance of a
 * failed notification, the catch path — is covered once in
 * `run-form-submission.spec.ts` and is not re-tested here.
 */

import { submitContact } from '@/lib/actions/contact';
import { sendEmail } from '@/lib/email/transport';
import { createSubmission } from '@/lib/repositories/submissions';
import { verifyTurnstileToken } from '@/lib/turnstile';

vi.mock('@/lib/email/transport', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/lib/repositories/services', () => ({
  findServiceIdsBySlugs: vi.fn().mockResolvedValue(['id-1']),
  listServices: vi.fn().mockResolvedValue([{ name: 'AI enablement', slug: 'ai-enablement' }]),
}));
vi.mock('@/lib/repositories/submissions', () => ({
  createSubmission: vi.fn().mockResolvedValue({ id: 's1', status: 'new' }),
}));
vi.mock('@/lib/turnstile', () => ({
  verifyTurnstileToken: vi.fn().mockResolvedValue(true),
}));

const valid = {
  email: 'ada@example.com',
  message: 'Help my team adopt AI-assisted development.',
  name: 'Ada',
  reason: 'services',
  requestedServices: ['ai-enablement'],
  turnstileToken: 'tok',
  website: '',
};

beforeEach(() => {
  vi.mocked(verifyTurnstileToken).mockResolvedValue(true);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('submitContact', () => {
  it('stores the submission with the resolved service ids', async () => {
    await expect(submitContact(valid)).resolves.toEqual({ success: true });
    expect(createSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'services', requestedServiceIds: ['id-1'] })
    );
  });

  it('emails the owner with the requested service names', async () => {
    await submitContact(valid);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('AI enablement'),
        to: 'me@mkelley33.com',
      })
    );
  });

  it('asks the user to fix the highlighted fields when input is invalid', async () => {
    await expect(submitContact({ ...valid, email: 'nope' })).resolves.toEqual({
      error: 'check the highlighted fields and retry',
      success: false,
    });
  });

  it('offers a direct email address when storage throws', async () => {
    vi.mocked(createSubmission).mockRejectedValueOnce(new Error('db down'));
    await expect(submitContact(valid)).resolves.toEqual({
      error: 'something broke — email me directly at me@mkelley33.com',
      success: false,
    });
  });
});
