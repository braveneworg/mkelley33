// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { submitContact } from '@/lib/actions/contact';

vi.mock('@/lib/email/transport', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/lib/repositories/services', () => ({
  findServiceIdsBySlugs: vi.fn().mockResolvedValue(['id-1']),
  listServices: vi
    .fn()
    .mockResolvedValue([{ name: 'AI enablement', slug: 'ai-enablement' }]),
}));
vi.mock('@/lib/repositories/submissions', () => ({
  createSubmission: vi.fn().mockResolvedValue({ id: 's1', status: 'new' }),
}));
vi.mock('@/lib/turnstile', () => ({
  verifyTurnstileToken: vi.fn().mockResolvedValue(true),
}));

import { sendEmail } from '@/lib/email/transport';
import { createSubmission } from '@/lib/repositories/submissions';
import { verifyTurnstileToken } from '@/lib/turnstile';

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
  vi.clearAllMocks();
});

describe('submitContact', () => {
  it('stores, emails, and succeeds on the happy path', async () => {
    await expect(submitContact(valid)).resolves.toEqual({ success: true });
    expect(createSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'services', requestedServiceIds: ['id-1'] }),
    );
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it('silently accepts a filled honeypot without storing', async () => {
    await expect(
      submitContact({ ...valid, website: 'spam.example' }),
    ).resolves.toEqual({ success: true });
    expect(createSubmission).not.toHaveBeenCalled();
    expect(verifyTurnstileToken).not.toHaveBeenCalled();
  });

  it('rejects invalid input and failed verification', async () => {
    const bad = await submitContact({ ...valid, email: 'nope' });
    expect(bad.success).toBe(false);
    vi.mocked(verifyTurnstileToken).mockResolvedValueOnce(false);
    const unverified = await submitContact(valid);
    expect(unverified.success).toBe(false);
    expect(createSubmission).not.toHaveBeenCalled();
  });

  it('still succeeds when the notification email fails', async () => {
    vi.mocked(sendEmail).mockResolvedValueOnce(false);
    await expect(submitContact(valid)).resolves.toEqual({ success: true });
    expect(createSubmission).toHaveBeenCalledOnce();
  });

  it('fails with a friendly error when storage throws', async () => {
    vi.mocked(createSubmission).mockRejectedValueOnce(new Error('db down'));
    const result = await submitContact(valid);
    expect(result.success).toBe(false);
    expect(result.error).toContain('me@mkelley33.com');
  });
});
