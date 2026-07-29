/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Prints the SES SMTP password (`SMTP_PASS`) for an IAM secret access key —
 * SES rejects the key itself. The derivation and its tests live in
 * src/lib/deploy/ses-smtp-password.ts; this is only the CLI around it.
 *
 * The password goes to stdout so it can be piped straight into the project
 * env without ever touching disk:
 *
 *   pnpm exec tsx scripts/derive-smtp-credentials.ts "$AWS_SECRET_ACCESS_KEY" us-east-2 \
 *     | pnpm exec vercel env add SMTP_PASS production --sensitive
 *
 * The key is an argv value, so it is visible in `ps` while the command runs
 * — fine on your own machine, not on a shared host. See docs/deploy.md.
 */
import { deriveSesSmtpPassword } from '../src/lib/deploy/ses-smtp-password';

const [secretAccessKey, region] = process.argv.slice(2);

if (secretAccessKey === undefined || region === undefined) {
  console.error('usage: tsx scripts/derive-smtp-credentials.ts <secret-access-key> <region>');
  process.exit(2);
}

try {
  console.info(deriveSesSmtpPassword(secretAccessKey, region));
} catch (error) {
  // The message names which argument was blank — never the value.
  console.error(error instanceof Error ? error.message : 'could not derive the SMTP password');
  process.exit(2);
}
