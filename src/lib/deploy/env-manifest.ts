/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * The single source of truth for what a production deploy must (and must
 * not) have in its environment. The deploy workflow audits the Vercel
 * project env against these records before building, so a missing key fails
 * the deploy by NAME instead of shipping a silently degraded site (the app
 * itself fails open — JSON email transport, Turnstile test keys — which is
 * right for resilience and wrong as a deploy default).
 *
 * One record per variable. Everything downstream — the required list, the
 * sensitive list, the docs guards in the spec — derives from
 * REQUIRED_DEPLOY_ENV_VARS, so adding a variable is one edit here plus the
 * documentation the spec then demands.
 */

/**
 * `sensitive: true` means the value is stored with
 * `vercel env add --sensitive`: `vercel pull` cannot read it back and
 * writes a redaction marker in its place. That is why the preflight asserts
 * PRESENCE and nothing else — it has no way to tell a marker from a value,
 * so anything that judged what a value looks like would fail every deploy
 * against a perfectly good stored one. A `DATABASE_URL` scheme check
 * passed its unit tests and nearly shipped that way, and a shape check on
 * the Blob token did stop the deploy on 2026-11-23, the day the owner made
 * that token sensitive. See
 * docs/lessons/deploy/vercel-pull-redacts-sensitive-env.md.
 *
 * A value's shape is checked where the value is visible: the build on
 * Vercel. For the Blob token that is the adapter itself, which refuses a
 * token it cannot parse — src/payload.config.spec.ts pins it.
 */
export interface RequiredDeployEnvVar {
  name: string;
  sensitive: boolean;
}

export const REQUIRED_DEPLOY_ENV_VARS: readonly RequiredDeployEnvVar[] = [
  { name: 'BLOB_READ_WRITE_TOKEN', sensitive: true },
  { name: 'CONTACT_TO', sensitive: false },
  { name: 'DATABASE_URL', sensitive: true },
  { name: 'EMAIL_FROM', sensitive: false },
  { name: 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', sensitive: false },
  { name: 'PAYLOAD_SECRET', sensitive: true },
  { name: 'SMTP_HOST', sensitive: false },
  { name: 'SMTP_PASS', sensitive: true },
  { name: 'SMTP_PORT', sensitive: false },
  { name: 'SMTP_USER', sensitive: true },
  { name: 'TURNSTILE_SECRET_KEY', sensitive: true },
];

export const REQUIRED_DEPLOY_ENV: readonly string[] = REQUIRED_DEPLOY_ENV_VARS.map(
  ({ name }) => name
);

/** Names whose pulled "value" is a redaction marker — presence-only. */
export const SENSITIVE_DEPLOY_ENV: readonly string[] = REQUIRED_DEPLOY_ENV_VARS.filter(
  ({ sensitive }) => sensitive
).map(({ name }) => name);

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
