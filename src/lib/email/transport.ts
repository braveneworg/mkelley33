import nodemailer from 'nodemailer';

import type { Transporter } from 'nodemailer';

export interface SendEmailInput {
  subject: string;
  text: string;
  to: string;
}

let transporter: null | Transporter<unknown> = null;

/**
 * JSON-transport payloads carry confirm/unsubscribe links, so writing them to
 * server logs is only safe where the logs are local: development, or a run
 * that explicitly opts in (the E2E harness sets EMAIL_LOG_UNSENT=true so
 * specs can scrape confirm links). A production deployment that merely lost
 * its SMTP config must never leak tokens into log storage.
 */
const shouldLogUnsentMessage = (): boolean =>
  process.env.EMAIL_LOG_UNSENT === 'true' || process.env.NODE_ENV === 'development';

const jsonTransportMessage = (info: unknown): null | string =>
  info !== null &&
  typeof info === 'object' &&
  'message' in info &&
  typeof (info as { message: unknown }).message === 'string'
    ? (info as { message: string }).message
    : null;

const createTransport = (): Transporter<unknown> => {
  const host = process.env.SMTP_HOST;
  if (!host) {
    const message = 'SMTP_HOST unset — email disabled, using JSON transport';
    if (process.env.NODE_ENV === 'production') {
      console.error(message);
    } else {
      console.warn(message);
    }
    return nodemailer.createTransport({ jsonTransport: true });
  }
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    auth: {
      pass: process.env.SMTP_PASS ?? '',
      user: process.env.SMTP_USER ?? '',
    },
    host,
    port,
    requireTLS: port !== 465,
    secure: port === 465,
  });
};

/** Never throws — email failure must not break the calling flow (spec §7). */
export const sendEmail = async (input: SendEmailInput): Promise<boolean> => {
  transporter ??= createTransport();
  try {
    const info: unknown = await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? 'mkelley33.com <no-reply@mkelley33.com>',
      subject: input.subject,
      text: input.text,
      to: input.to,
    });
    const unsentMessage = jsonTransportMessage(info);
    if (!process.env.SMTP_HOST && shouldLogUnsentMessage() && unsentMessage !== null) {
      console.info('email (not sent):', unsentMessage);
    }
    return true;
  } catch (error) {
    console.error('sendEmail failed:', error);
    return false;
  }
};
