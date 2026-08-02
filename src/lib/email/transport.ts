/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { createMailer } from '@/lib/email/mailer';
import type { Mailer, SendEmailInput } from '@/lib/email/mailer';
import { resolveMailerConfig } from '@/lib/email/mailer-config';

export type { SendEmailInput };

let defaultMailer: null | Mailer = null;

/**
 * The mailer the site sends through: built from `process.env` on first use and
 * reused, so a configured SMTP connection is not rebuilt per message.
 *
 * The memo used to be unreachable — nothing could rebuild it, so a spec that
 * wanted a differently-configured transport had to reset the whole module
 * registry to get one. {@link resetDefaultMailer} is that door.
 */
const defaultMailerForEnv = (): Mailer =>
  (defaultMailer ??= createMailer(resolveMailerConfig(process.env)));

/** Drops the memo so the next send re-reads the environment. */
export const resetDefaultMailer = (): void => {
  defaultMailer = null;
};

/**
 * Sends one message and never throws — email failure must not break the
 * calling flow (spec §7); a failed delivery resolves `false`, already logged.
 *
 * Callers pass an input and nothing else. The second argument is the seam:
 * pass a {@link Mailer} to send through it instead of the site's own.
 */
export const sendEmail = async (
  input: SendEmailInput,
  mailer: Mailer = defaultMailerForEnv()
): Promise<boolean> => mailer.send(input);
