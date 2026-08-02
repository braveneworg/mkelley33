/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import type { Mailer, SendEmailInput } from '@/lib/email/mailer';
import { resetDefaultMailer, sendEmail } from '@/lib/email/transport';

/** A confirm link of the shape e2e/newsletter.spec.ts scrapes out of the log. */
const CONFIRM_LINK = `/newsletter/confirm?token=${'a1b2c3d4'.repeat(8)}`;

const INPUT: SendEmailInput = { subject: 's', text: 't', to: 'a@b.com' };

const fakeMailer = (verdict: boolean): Mailer => ({
  send: vi.fn(() => Promise.resolve(verdict)),
});

describe('sendEmail', () => {
  beforeEach(() => {
    resetDefaultMailer();
    vi.stubEnv('SMTP_HOST', '');
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetDefaultMailer();
  });

  describe('with an injected mailer', () => {
    it('hands the message to the mailer it was given', async () => {
      const mailer = fakeMailer(true);
      await sendEmail(INPUT, mailer);

      expect(mailer.send).toHaveBeenCalledWith(INPUT);
    });

    it('answers with the mailer verdict', async () => {
      await expect(sendEmail(INPUT, fakeMailer(false))).resolves.toBe(false);
    });

    it('leaves the default mailer unbuilt', async () => {
      await sendEmail(INPUT, fakeMailer(true));

      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('with the default mailer', () => {
    it('resolves true through the JSON transport when SMTP_HOST is unset', async () => {
      await expect(sendEmail(INPUT)).resolves.toBe(true);
    });

    it('announces that email is disabled', async () => {
      await sendEmail(INPUT);

      expect(console.warn).toHaveBeenCalledWith(
        'SMTP_HOST unset — email disabled, using JSON transport'
      );
    });

    it('logs the unsent body for link scraping when EMAIL_LOG_UNSENT opts in', async () => {
      vi.stubEnv('EMAIL_LOG_UNSENT', 'true');
      await sendEmail({ ...INPUT, text: `confirm: https://mkelley33.com${CONFIRM_LINK}` });

      expect(console.info).toHaveBeenCalledWith(
        'email (not sent):',
        expect.stringContaining(CONFIRM_LINK)
      );
    });

    it('keeps unsent bodies out of the log without the opt-in', async () => {
      vi.stubEnv('EMAIL_LOG_UNSENT', '');
      await sendEmail(INPUT);

      expect(console.info).not.toHaveBeenCalled();
    });

    it('builds it once and reuses it across sends', async () => {
      await sendEmail(INPUT);
      await sendEmail(INPUT);

      expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('rebuilds it after a reset so a changed environment takes effect', async () => {
      await sendEmail(INPUT);
      resetDefaultMailer();
      await sendEmail(INPUT);

      expect(console.warn).toHaveBeenCalledTimes(2);
    });
  });
});
