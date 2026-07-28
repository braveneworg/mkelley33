/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { deriveSesSmtpPassword } from './ses-smtp-password';

// Not a real credential — a fixed, obviously-fake key so the expectations
// below are reproducible without a secret anywhere near this file.
const FIXTURE_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

describe('deriveSesSmtpPassword', () => {
  it('is deterministic for the same key and region', () => {
    expect(deriveSesSmtpPassword(FIXTURE_KEY, 'us-east-2')).toBe(
      deriveSesSmtpPassword(FIXTURE_KEY, 'us-east-2')
    );
  });

  /**
   * A regression pin, not an AWS-published vector: it locks the HMAC chain
   * (date → region → `ses` → `aws4_request` → `SendRawEmail`) and the 0x04
   * version prefix so a refactor cannot quietly change the output. Proof
   * that the algorithm is the one SES wants comes from SES accepting the
   * credential, not from here.
   */
  it('pins the derived password for a known key and region', () => {
    expect(deriveSesSmtpPassword(FIXTURE_KEY, 'us-east-2')).toBe(
      'BMPPgbAHoFVbze1Ud0oA5uNdXRwUXUZ+qOwphGJbl/cS'
    );
  });

  it('derives a different password per region', () => {
    expect(deriveSesSmtpPassword(FIXTURE_KEY, 'us-east-2')).not.toBe(
      deriveSesSmtpPassword(FIXTURE_KEY, 'eu-west-1')
    );
  });

  it('derives a different password per secret access key', () => {
    expect(deriveSesSmtpPassword(FIXTURE_KEY, 'us-east-2')).not.toBe(
      deriveSesSmtpPassword(`${FIXTURE_KEY}x`, 'us-east-2')
    );
  });

  it('emits the version byte SES expects ahead of the signature', () => {
    const decoded = Buffer.from(deriveSesSmtpPassword(FIXTURE_KEY, 'us-east-2'), 'base64');

    expect(decoded[0]).toBe(0x04);
  });

  it('emits a version byte followed by a full SHA-256 signature', () => {
    const decoded = Buffer.from(deriveSesSmtpPassword(FIXTURE_KEY, 'us-east-2'), 'base64');

    expect(decoded).toHaveLength(33);
  });

  it('rejects an empty secret access key rather than deriving from nothing', () => {
    expect(() => deriveSesSmtpPassword('', 'us-east-2')).toThrow(/secret access key/i);
  });

  it('rejects an empty region rather than deriving from nothing', () => {
    expect(() => deriveSesSmtpPassword(FIXTURE_KEY, '')).toThrow(/region/i);
  });
});
