/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Derives the SES SMTP password (`SMTP_PASS`) from an IAM secret access key.
 *
 * SES will not accept the secret access key itself: the SMTP endpoint wants
 * an AWS Signature Version 4 key derived from it, region-scoped and tagged
 * with a version byte. Nothing here is stored or logged — the caller feeds
 * the result straight into `vercel env add`; see docs/deploy.md.
 */
import { createHmac } from 'node:crypto';

/** The chain is signed against a fixed date — SES pins it rather than using today's. */
const DATE = '11111111';
const SERVICE = 'ses';
const MESSAGE = 'SendRawEmail';
const TERMINAL = 'aws4_request';

/** SES prefixes the signature with the version of the derivation it expects. */
const VERSION = 0x04;

const sign = (key: Buffer, message: string): Buffer =>
  createHmac('sha256', key).update(message, 'utf8').digest();

/**
 * @param secretAccessKey IAM secret access key for the SES sending user.
 * @param region the SES region the SMTP endpoint lives in, e.g. `us-east-2`.
 * @returns the base64 SMTP password SES authenticates against.
 * @throws if either argument is empty — deriving from a blank input would
 *   produce a plausible-looking password that can never authenticate.
 */
export const deriveSesSmtpPassword = (secretAccessKey: string, region: string): string => {
  if (secretAccessKey === '') {
    throw new Error('a secret access key is required');
  }
  if (region === '') {
    throw new Error('a region is required');
  }

  const signature = [region, SERVICE, TERMINAL, MESSAGE].reduce(
    (key, message) => sign(key, message),
    sign(Buffer.from(`AWS4${secretAccessKey}`, 'utf8'), DATE)
  );

  return Buffer.concat([Buffer.from([VERSION]), signature]).toString('base64');
};
