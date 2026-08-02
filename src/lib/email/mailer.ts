/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import nodemailer from 'nodemailer';

import type { JsonMailerConfig, MailerConfig, SmtpMailerConfig } from '@/lib/email/mailer-config';

export interface SendEmailInput {
  subject: string;
  text: string;
  to: string;
}

/**
 * The delivery seam. An implementation resolves `false` rather than rejecting:
 * a notification that fails must not break the flow that triggered it, and
 * that guarantee belongs to the interface, not to each caller's try/catch.
 */
export interface Mailer {
  send: (input: SendEmailInput) => Promise<boolean>;
}

/** The slice of a nodemailer transporter the adapters actually use. */
export interface MailTransport {
  sendMail: (message: OutgoingMessage) => Promise<unknown>;
}

/** Builds the transport a config describes; injectable so specs can watch it. */
export type TransportFactory = (config: MailerConfig) => MailTransport;

interface OutgoingMessage {
  from: string;
  subject: string;
  text: string;
  to: string;
}

const DISABLED_NOTICE = 'SMTP_HOST unset — email disabled, using JSON transport';

const outgoing = (config: MailerConfig, input: SendEmailInput): OutgoingMessage => ({
  from: config.from,
  subject: input.subject,
  text: input.text,
  to: input.to,
});

/** The body the JSON transport echoes back, when it echoes one at all. */
const jsonTransportMessage = (info: unknown): null | string =>
  info !== null &&
  typeof info === 'object' &&
  'message' in info &&
  typeof (info as { message: unknown }).message === 'string'
    ? (info as { message: string }).message
    : null;

/**
 * Delivers nowhere and says so. The body is written to the log only when the
 * config opted in — see JsonMailerConfig for why that gate exists — and the
 * line below is a contract: e2e/newsletter.spec.ts scrapes it for the confirm
 * link, so its shape cannot change.
 */
const jsonMailer = (config: JsonMailerConfig, transport: MailTransport): Mailer => ({
  send: async (input) => {
    const message = jsonTransportMessage(await transport.sendMail(outgoing(config, input)));
    if (config.logUnsent && message !== null) {
      console.info('email (not sent):', message);
    }
    return true;
  },
});

/** Delivers over SMTP, and never writes a message body anywhere. */
const smtpMailer = (config: SmtpMailerConfig, transport: MailTransport): Mailer => ({
  send: async (input) => {
    await transport.sendMail(outgoing(config, input));
    return true;
  },
});

/** Never throws — email failure must not break the calling flow (spec §7). */
const neverThrowing = (mailer: Mailer): Mailer => ({
  send: async (input) => {
    try {
      return await mailer.send(input);
    } catch (error) {
      console.error('sendEmail failed:', error);
      return false;
    }
  },
});

/**
 * A missing SMTP_HOST is a misconfiguration everywhere and a fatal one in
 * production, where it means the site silently stopped emailing.
 */
const announceDisabled = (severity: JsonMailerConfig['disabledNotice']): void => {
  if (severity === 'error') {
    console.error(DISABLED_NOTICE);
    return;
  }
  console.warn(DISABLED_NOTICE);
};

export const createNodemailerTransport: TransportFactory = (config) =>
  config.kind === 'json'
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        auth: config.auth,
        host: config.host,
        port: config.port,
        requireTLS: config.requireTLS,
        secure: config.secure,
      });

/**
 * Picks the adapter the config asks for and wraps it in the never-throw
 * guarantee. Which adapter is chosen is the whole of the SMTP_HOST decision —
 * downstream, neither adapter re-reads the environment.
 */
export const createMailer = (
  config: MailerConfig,
  createTransport: TransportFactory = createNodemailerTransport
): Mailer => {
  if (config.kind === 'json') {
    announceDisabled(config.disabledNotice);
    return neverThrowing(jsonMailer(config, createTransport(config)));
  }
  return neverThrowing(smtpMailer(config, createTransport(config)));
};
