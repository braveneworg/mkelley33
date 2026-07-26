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

  it('escalates the missing-SMTP_HOST notice to console.error in production', async () => {
    vi.stubEnv('SMTP_HOST', '');
    vi.stubEnv('NODE_ENV', 'production');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { sendEmail } = await import('@/lib/email/transport');
    await sendEmail({ subject: 's', text: 't', to: 'a@b.com' });

    expect(error).toHaveBeenCalledWith(expect.stringContaining('SMTP_HOST unset'));
    expect(warn).not.toHaveBeenCalled();
  });

  it('builds an authenticated transport from SMTP_* when a host is configured', async () => {
    const createTransport = vi.fn(() => ({ sendMail: () => Promise.resolve({}) }));
    vi.resetModules();
    vi.doMock('nodemailer', () => ({ default: { createTransport } }));
    vi.stubEnv('SMTP_HOST', 'smtp.example.com');
    vi.stubEnv('SMTP_PORT', '465');
    vi.stubEnv('SMTP_USER', 'mailer');
    vi.stubEnv('SMTP_PASS', 'secret');

    const { sendEmail } = await import('@/lib/email/transport');
    await expect(sendEmail({ subject: 's', text: 't', to: 'a@b.com' })).resolves.toBe(true);

    expect(createTransport).toHaveBeenCalledWith({
      auth: { pass: 'secret', user: 'mailer' },
      host: 'smtp.example.com',
      port: 465,
      requireTLS: false,
      secure: true,
    });
    vi.doUnmock('nodemailer');
  });

  it('defaults to port 587 without implicit TLS', async () => {
    const createTransport = vi.fn(() => ({ sendMail: () => Promise.resolve({}) }));
    vi.resetModules();
    vi.doMock('nodemailer', () => ({ default: { createTransport } }));
    vi.stubEnv('SMTP_HOST', 'smtp.example.com');

    const { sendEmail } = await import('@/lib/email/transport');
    await sendEmail({ subject: 's', text: 't', to: 'a@b.com' });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587, requireTLS: true, secure: false })
    );
    vi.doUnmock('nodemailer');
  });

  it('logs the JSON-transport message for link scraping when SMTP_HOST is unset', async () => {
    vi.stubEnv('SMTP_HOST', '');
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { sendEmail } = await import('@/lib/email/transport');
    await expect(sendEmail({ subject: 's', text: 't', to: 'a@b.com' })).resolves.toBe(true);

    expect(info).toHaveBeenCalledWith('email (not sent):', expect.any(String));
  });
});
