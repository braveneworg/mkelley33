/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * The single source of truth for what a production deploy must (and must
 * not) have in its environment. The deploy workflow audits the Vercel
 * project env against these lists before building, so a missing key fails
 * the deploy by NAME instead of shipping a silently degraded site (the app
 * itself fails open — JSON email transport, Turnstile test keys — which is
 * right for resilience and wrong as a deploy default).
 *
 * When the app starts reading a new env var, add it here; the deploy
 * preflight and docs/deploy.md follow this file.
 */
export const REQUIRED_DEPLOY_ENV = [
  'BLOB_READ_WRITE_TOKEN',
  'CONTACT_TO',
  'DATABASE_URL',
  'EMAIL_FROM',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
  'PAYLOAD_SECRET',
  'SMTP_HOST',
  'SMTP_PASS',
  'SMTP_PORT',
  'SMTP_USER',
  'TURNSTILE_SECRET_KEY',
] as const;

/**
 * Present in production only by mistake. EMAIL_LOG_UNSENT opts the JSON
 * email transport into logging full message bodies (confirm/unsubscribe
 * tokens included) — an E2E-harness affordance that must never reach
 * production logs.
 */
export const FORBIDDEN_DEPLOY_ENV = ['EMAIL_LOG_UNSENT'] as const;

export interface DeployEnvAudit {
  forbidden: string[];
  missing: string[];
}

/**
 * Audits a set of present env-var NAMES against the manifest. Values never
 * enter this function — callers pass key names only, so nothing secret can
 * leak through its output.
 */
export const auditDeployEnv = (presentKeys: Iterable<string>): DeployEnvAudit => {
  const present = new Set(presentKeys);
  return {
    forbidden: FORBIDDEN_DEPLOY_ENV.filter((name) => present.has(name)).sort(),
    missing: REQUIRED_DEPLOY_ENV.filter((name) => !present.has(name)).sort(),
  };
};
