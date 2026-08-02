/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { resolveMailerConfig } from '@/lib/email/mailer-config';

const SMTP_ENV = { SMTP_HOST: 'smtp.example.com' };

describe('resolveMailerConfig', () => {
  describe('transport identity', () => {
    it.each([
      { expected: 'json', label: 'SMTP_HOST is absent', env: {} },
      { expected: 'json', label: 'SMTP_HOST is empty', env: { SMTP_HOST: '' } },
      { expected: 'smtp', label: 'SMTP_HOST names a server', env: SMTP_ENV },
    ])('resolves the $expected transport when $label', ({ env, expected }) => {
      expect(resolveMailerConfig(env).kind).toBe(expected);
    });
  });

  describe('SMTP_PORT drives the TLS mode', () => {
    it.each([
      { expected: { port: 587, requireTLS: true, secure: false }, port: undefined },
      { expected: { port: 587, requireTLS: true, secure: false }, port: '' },
      { expected: { port: 587, requireTLS: true, secure: false }, port: '587' },
      { expected: { port: 465, requireTLS: false, secure: true }, port: '465' },
      { expected: { port: 2525, requireTLS: true, secure: false }, port: '2525' },
      { expected: { port: 25, requireTLS: true, secure: false }, port: '25' },
    ])('maps SMTP_PORT "$port" to port $expected.port', ({ expected, port }) => {
      expect(resolveMailerConfig({ ...SMTP_ENV, SMTP_PORT: port })).toMatchObject(expected);
    });
  });

  describe('credentials and sender', () => {
    it('carries every SMTP_* value into the config', () => {
      expect(
        resolveMailerConfig({
          EMAIL_FROM: 'site <no-reply@example.com>',
          SMTP_HOST: 'smtp.example.com',
          SMTP_PASS: 'secret',
          SMTP_PORT: '465',
          SMTP_USER: 'mailer',
        })
      ).toEqual({
        auth: { pass: 'secret', user: 'mailer' },
        from: 'site <no-reply@example.com>',
        host: 'smtp.example.com',
        kind: 'smtp',
        port: 465,
        requireTLS: false,
        secure: true,
      });
    });

    it('authenticates with empty credentials when SMTP_USER and SMTP_PASS are unset', () => {
      expect(resolveMailerConfig(SMTP_ENV)).toMatchObject({ auth: { pass: '', user: '' } });
    });

    it('falls back to the site sender when EMAIL_FROM is unset', () => {
      expect(resolveMailerConfig(SMTP_ENV)).toMatchObject({
        from: 'mkelley33.com <no-reply@mkelley33.com>',
      });
    });

    it('keeps the EMAIL_FROM fallback on the disabled transport too', () => {
      expect(resolveMailerConfig({})).toMatchObject({
        from: 'mkelley33.com <no-reply@mkelley33.com>',
      });
    });
  });

  describe('unsent-body logging', () => {
    it.each([
      { expected: true, flag: 'true', nodeEnv: 'production' },
      { expected: true, flag: 'true', nodeEnv: 'test' },
      { expected: true, flag: undefined, nodeEnv: 'development' },
      { expected: false, flag: undefined, nodeEnv: 'production' },
      { expected: false, flag: '', nodeEnv: 'test' },
      { expected: false, flag: 'TRUE', nodeEnv: 'production' },
      { expected: false, flag: '1', nodeEnv: 'test' },
      { expected: false, flag: undefined, nodeEnv: undefined },
    ])(
      'logs unsent bodies = $expected for EMAIL_LOG_UNSENT "$flag" in $nodeEnv',
      ({ expected, flag, nodeEnv }) => {
        expect(resolveMailerConfig({ EMAIL_LOG_UNSENT: flag, NODE_ENV: nodeEnv })).toMatchObject({
          logUnsent: expected,
        });
      }
    );

    it('never offers the opt-in to a configured SMTP transport', () => {
      expect(resolveMailerConfig({ ...SMTP_ENV, EMAIL_LOG_UNSENT: 'true' })).not.toHaveProperty(
        'logUnsent'
      );
    });
  });

  describe('missing-host notice', () => {
    it.each([
      { expected: 'error', nodeEnv: 'production' },
      { expected: 'warn', nodeEnv: 'development' },
      { expected: 'warn', nodeEnv: 'test' },
      { expected: 'warn', nodeEnv: undefined },
    ])('escalates the notice to console.$expected in $nodeEnv', ({ expected, nodeEnv }) => {
      expect(resolveMailerConfig({ NODE_ENV: nodeEnv })).toMatchObject({
        disabledNotice: expected,
      });
    });
  });
});
