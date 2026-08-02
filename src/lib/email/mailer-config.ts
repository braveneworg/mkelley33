/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * The mailer's real interface is its environment, so this module states it:
 * seven variables in, one typed config out, no side effects and no I/O. Every
 * decision the transport used to make while it was building itself — which
 * transport, which TLS mode, whether an unsent body may be logged — is made
 * here, where it can be read and tested as a table.
 *
 * `process.env` is the only production caller; specs pass literals.
 */
export interface MailerEnv {
  EMAIL_FROM?: string;
  EMAIL_LOG_UNSENT?: string;
  NODE_ENV?: string;
  SMTP_HOST?: string;
  SMTP_PASS?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
}

export interface SmtpAuth {
  pass: string;
  user: string;
}

/** A real SMTP server: reached when SMTP_HOST names one. */
export interface SmtpMailerConfig {
  auth: SmtpAuth;
  from: string;
  host: string;
  kind: 'smtp';
  port: number;
  requireTLS: boolean;
  secure: boolean;
}

/**
 * The fallback used when SMTP_HOST is unset — nothing leaves the process.
 *
 * `logUnsent` is the E2E harness's affordance and nothing else: JSON-transport
 * payloads carry confirm/unsubscribe links, so writing them to server logs is
 * only safe where the logs are local — development, or a run that explicitly
 * opts in with EMAIL_LOG_UNSENT (the harness sets it so specs can scrape
 * confirm links). A production deployment that merely lost its SMTP config
 * must never leak tokens into log storage, which is why EMAIL_LOG_UNSENT is
 * listed in FORBIDDEN_DEPLOY_ENV.
 */
export interface JsonMailerConfig {
  /** Severity of the one-time "SMTP_HOST unset" notice. */
  disabledNotice: 'error' | 'warn';
  from: string;
  kind: 'json';
  logUnsent: boolean;
}

export type MailerConfig = JsonMailerConfig | SmtpMailerConfig;

const DEFAULT_FROM = 'mkelley33.com <no-reply@mkelley33.com>';

/** Submission port: STARTTLS, negotiated after connecting. */
const DEFAULT_PORT = 587;

/** The one port that speaks TLS from the first byte instead of upgrading. */
const IMPLICIT_TLS_PORT = 465;

/** Turns the mailer's environment into the config that describes it. */
export const resolveMailerConfig = (env: MailerEnv): MailerConfig => {
  const from = env.EMAIL_FROM ?? DEFAULT_FROM;
  if (!env.SMTP_HOST) {
    return {
      disabledNotice: env.NODE_ENV === 'production' ? 'error' : 'warn',
      from,
      kind: 'json',
      logUnsent: env.EMAIL_LOG_UNSENT === 'true' || env.NODE_ENV === 'development',
    };
  }
  const port = Number(env.SMTP_PORT || DEFAULT_PORT);
  return {
    auth: { pass: env.SMTP_PASS ?? '', user: env.SMTP_USER ?? '' },
    from,
    host: env.SMTP_HOST,
    kind: 'smtp',
    port,
    requireTLS: port !== IMPLICIT_TLS_PORT,
    secure: port === IMPLICIT_TLS_PORT,
  };
};
