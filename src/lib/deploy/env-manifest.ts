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

export interface DeployEnvFormat {
  /** Shown to whoever has to fix the value — never the value itself. */
  hint: string;
  pattern: RegExp;
}

/**
 * Shapes for the vars where a present-but-wrong value fails silently at
 * deploy time instead of loudly at audit time.
 *
 * BLOB_READ_WRITE_TOKEN earns its place: src/payload.config.ts registers the
 * Vercel Blob adapter whenever the var is truthy, and the adapter throws on a
 * token it cannot parse. That throw happens inside buildConfig, so Payload
 * never initializes and every route that touches it — the whole /admin —
 * fails, while the presence-only audit reports a healthy environment.
 *
 * A name absent from this map is unconstrained; only add one where the format
 * is genuinely fixed, since a too-strict pattern blocks a valid deploy.
 *
 * NEVER add a name stored as a sensitive Vercel variable. `vercel pull`
 * cannot read those back — it writes a redaction marker — so the pattern
 * would test the marker and fail every deploy while the stored value is
 * perfectly good. BLOB_READ_WRITE_TOKEN is checkable only because the Blob
 * store connection creates it, rather than `vercel env add --sensitive`.
 * See docs/deploy.md, "Why Vercel builds, not the runner".
 */
export const DEPLOY_ENV_FORMATS: ReadonlyMap<string, DeployEnvFormat> = new Map([
  [
    'BLOB_READ_WRITE_TOKEN',
    {
      hint: 'vercel_blob_rw_<store id>_<random string>',
      pattern: /^vercel_blob_rw_[A-Za-z0-9]+_[A-Za-z0-9]+$/,
    },
  ],
]);

/**
 * Audits env-var VALUES against the format map and returns the NAMES that
 * fail, sorted. Values enter this function but never leave it — the return is
 * names only, so a caller cannot accidentally print a secret it rejected.
 * Names with no declared format pass untouched.
 */
export const auditDeployEnvFormats = (entries: Iterable<readonly [string, string]>): string[] =>
  [...entries]
    .filter(([name, value]) => DEPLOY_ENV_FORMATS.get(name)?.pattern.test(value) === false)
    .map(([name]) => name)
    .sort();
