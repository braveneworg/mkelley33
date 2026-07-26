// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('sendEmail', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('resolves true via the JSON transport when SMTP_HOST is unset', async () => {
    vi.stubEnv('SMTP_HOST', '');
    const { sendEmail } = await import('@/lib/email/transport');
    await expect(sendEmail({ subject: 's', text: 't', to: 'a@b.com' })).resolves.toBe(true);
  });

  it('returns false instead of throwing when the transport fails', async () => {
    vi.resetModules();
    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: () => ({
          sendMail: () => Promise.reject(new Error('smtp down')),
        }),
      },
    }));
    const { sendEmail } = await import('@/lib/email/transport');
    await expect(sendEmail({ subject: 's', text: 't', to: 'a@b.com' })).resolves.toBe(false);
    vi.doUnmock('nodemailer');
  });
});
