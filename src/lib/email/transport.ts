import nodemailer from 'nodemailer';

import type { Transporter } from 'nodemailer';

export interface SendEmailInput {
  subject: string;
  text: string;
  to: string;
}

let transporter: null | Transporter<unknown> = null;

const createTransport = (): Transporter<unknown> => {
  const host = process.env.SMTP_HOST;
  if (!host) {
    const message = 'SMTP_HOST unset — email disabled, using JSON transport (logged only)';
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
    secure: port === 465,
  });
};

/** Never throws — email failure must not break the calling flow (spec §7). */
export const sendEmail = async (input: SendEmailInput): Promise<boolean> => {
  transporter ??= createTransport();
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? 'mkelley33.com <no-reply@mkelley33.com>',
      subject: input.subject,
      text: input.text,
      to: input.to,
    });
    return true;
  } catch (error) {
    console.error('sendEmail failed:', error);
    return false;
  }
};
