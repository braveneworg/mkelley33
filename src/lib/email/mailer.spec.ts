/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { createMailer, createNodemailerTransport } from '@/lib/email/mailer';
import type { MailTransport, SendEmailInput } from '@/lib/email/mailer';
import type { JsonMailerConfig, SmtpMailerConfig } from '@/lib/email/mailer-config';

/**
 * The only nodemailer mock left in the suite, and it earns its place: the
 * options object handed to `createTransport` IS the SMTP adapter's behaviour,
 * and nothing else can observe it. Every other test here drives an adapter
 * through an injected transport instead.
 */
const { createTransport } = vi.hoisted(() => ({
  createTransport: vi.fn(() => ({ sendMail: vi.fn(() => Promise.resolve({})) })),
}));

vi.mock('nodemailer', () => ({ default: { createTransport } }));

const INPUT: SendEmailInput = { subject: 's', text: 't', to: 'a@b.com' };

const SMTP_CONFIG: SmtpMailerConfig = {
  auth: { pass: 'secret', user: 'mailer' },
  from: 'site <no-reply@example.com>',
  host: 'smtp.example.com',
  kind: 'smtp',
  port: 465,
  requireTLS: false,
  secure: true,
};

const JSON_CONFIG: JsonMailerConfig = {
  disabledNotice: 'warn',
  from: 'site <no-reply@example.com>',
  kind: 'json',
  logUnsent: false,
};

const transportOf = (info: unknown): MailTransport => ({
  sendMail: vi.fn(() => Promise.resolve(info)),
});

const rejectingTransport = (error: Error): MailTransport => ({
  sendMail: vi.fn(() => Promise.reject(error)),
});

describe('createMailer', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('SMTP delivery', () => {
    it('addresses the message from the configured sender', async () => {
      const transport = transportOf({});
      await createMailer(SMTP_CONFIG, () => transport).send(INPUT);

      expect(transport.sendMail).toHaveBeenCalledWith({
        from: 'site <no-reply@example.com>',
        subject: 's',
        text: 't',
        to: 'a@b.com',
      });
    });

    it('resolves true once the transport accepts the message', async () => {
      const mailer = createMailer(SMTP_CONFIG, () => transportOf({}));

      await expect(mailer.send(INPUT)).resolves.toBe(true);
    });

    it('resolves false instead of rejecting when the transport fails', async () => {
      const mailer = createMailer(SMTP_CONFIG, () => rejectingTransport(new Error('smtp down')));

      await expect(mailer.send(INPUT)).resolves.toBe(false);
    });

    it('reports the delivery failure to the server log', async () => {
      const failure = new Error('smtp down');
      await createMailer(SMTP_CONFIG, () => rejectingTransport(failure)).send(INPUT);

      expect(console.error).toHaveBeenCalledWith('sendEmail failed:', failure);
    });

    it('never logs message bodies, even when the transport echoes one', async () => {
      const mailer = createMailer(SMTP_CONFIG, () => transportOf({ message: '{"text":"t"}' }));
      await mailer.send(INPUT);

      expect(console.info).not.toHaveBeenCalled();
    });

    it('builds its transport from the config it was given', () => {
      const factory = vi.fn(() => transportOf({}));
      createMailer(SMTP_CONFIG, factory);

      expect(factory).toHaveBeenCalledWith(SMTP_CONFIG);
    });
  });

  describe('disabled JSON delivery', () => {
    it('warns that email is disabled when it builds the mailer', () => {
      createMailer(JSON_CONFIG, () => transportOf({}));

      expect(console.warn).toHaveBeenCalledWith(
        'SMTP_HOST unset — email disabled, using JSON transport'
      );
    });

    it('escalates that notice to console.error in production', () => {
      createMailer({ ...JSON_CONFIG, disabledNotice: 'error' }, () => transportOf({}));

      expect(console.error).toHaveBeenCalledWith(
        'SMTP_HOST unset — email disabled, using JSON transport'
      );
    });

    it('keeps the production notice off console.warn', () => {
      createMailer({ ...JSON_CONFIG, disabledNotice: 'error' }, () => transportOf({}));

      expect(console.warn).not.toHaveBeenCalled();
    });

    it('resolves true so a disabled mailer never fails its caller', async () => {
      const mailer = createMailer(JSON_CONFIG, () => transportOf({ message: '{"text":"t"}' }));

      await expect(mailer.send(INPUT)).resolves.toBe(true);
    });

    it('logs the unsent body verbatim when the config opts in', async () => {
      const message = '{"to":"a@b.com","text":"/newsletter/confirm?token=deadbeef"}';
      const mailer = createMailer({ ...JSON_CONFIG, logUnsent: true }, () =>
        transportOf({ message })
      );
      await mailer.send(INPUT);

      expect(console.info).toHaveBeenCalledWith('email (not sent):', message);
    });

    it('stays quiet about the body when the config does not opt in', async () => {
      const mailer = createMailer(JSON_CONFIG, () => transportOf({ message: '{"text":"t"}' }));
      await mailer.send(INPUT);

      expect(console.info).not.toHaveBeenCalled();
    });

    it.each([
      { info: null, label: 'nothing' },
      { info: 'accepted', label: 'a bare string' },
      { info: {}, label: 'a receipt with no message' },
      { info: { message: 42 }, label: 'a non-string message' },
    ])('stays quiet when the transport echoes $label', async ({ info }) => {
      const mailer = createMailer({ ...JSON_CONFIG, logUnsent: true }, () => transportOf(info));
      await mailer.send(INPUT);

      expect(console.info).not.toHaveBeenCalled();
    });
  });
});

describe('createNodemailerTransport', () => {
  it('builds an authenticated SMTP transport from the config', () => {
    createNodemailerTransport(SMTP_CONFIG);

    expect(createTransport).toHaveBeenCalledWith({
      auth: { pass: 'secret', user: 'mailer' },
      host: 'smtp.example.com',
      port: 465,
      requireTLS: false,
      secure: true,
    });
  });

  it('builds the JSON transport when email is disabled', () => {
    createNodemailerTransport(JSON_CONFIG);

    expect(createTransport).toHaveBeenCalledWith({ jsonTransport: true });
  });
});
