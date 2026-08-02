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
 * format map, the docs partition guards in the spec — derives from
 * REQUIRED_DEPLOY_ENV_VARS, so adding a variable is one edit here plus the
 * documentation the spec then demands.
 */

export interface DeployEnvFormat {
  /** Shown to whoever has to fix the value — never the value itself. */
  hint: string;
  pattern: RegExp;
}

/**
 * `sensitive: true` means the value is stored with
 * `vercel env add --sensitive`: `vercel pull` cannot read it back and
 * writes a redaction marker in its place, so the preflight can only assert
 * PRESENCE. The union makes declaring a `format` for a sensitive variable
 * unrepresentable — a pattern would test the marker and fail every deploy
 * against a perfectly good stored value. That mistake passed unit tests
 * once and nearly shipped; see
 * docs/lessons/deploy/vercel-pull-redacts-sensitive-env.md.
 *
 * `source` records how production obtains the value: `vercel-env` for
 * `vercel env add`, `blob-store` for values a store connection injects
 * (adding those by hand desyncs them from the store — see docs/deploy.md).
 */
export type RequiredDeployEnvVar =
  | {
      format?: DeployEnvFormat;
      name: string;
      sensitive: false;
      source: 'blob-store' | 'vercel-env';
    }
  | {
      name: string;
      sensitive: true;
      source: 'vercel-env';
    };

/**
 * BLOB_READ_WRITE_TOKEN earns its format: src/payload.config.ts registers
 * the Vercel Blob adapter whenever the var is truthy, and the adapter
 * throws on a token it cannot parse. That throw happens inside buildConfig,
 * so Payload never initializes and every route that touches it — the whole
 * /admin — fails, while the presence-only audit reports a healthy
 * environment. It is checkable at all only because the Blob store
 * connection creates it readable rather than `vercel env add --sensitive`.
 *
 * A record without a format is unconstrained; only add one where the shape
 * is genuinely fixed, since a too-strict pattern blocks a valid deploy.
 */
export const REQUIRED_DEPLOY_ENV_VARS: readonly RequiredDeployEnvVar[] = [
  {
    format: {
      hint: 'vercel_blob_rw_<store id>_<random string>',
      pattern: /^vercel_blob_rw_[A-Za-z0-9]+_[A-Za-z0-9]+$/,
    },
    name: 'BLOB_READ_WRITE_TOKEN',
    sensitive: false,
    source: 'blob-store',
  },
  { name: 'CONTACT_TO', sensitive: false, source: 'vercel-env' },
  { name: 'DATABASE_URL', sensitive: true, source: 'vercel-env' },
  { name: 'EMAIL_FROM', sensitive: false, source: 'vercel-env' },
  { name: 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', sensitive: false, source: 'vercel-env' },
  { name: 'PAYLOAD_SECRET', sensitive: true, source: 'vercel-env' },
  { name: 'SMTP_HOST', sensitive: false, source: 'vercel-env' },
  { name: 'SMTP_PASS', sensitive: true, source: 'vercel-env' },
  { name: 'SMTP_PORT', sensitive: false, source: 'vercel-env' },
  { name: 'SMTP_USER', sensitive: true, source: 'vercel-env' },
  { name: 'TURNSTILE_SECRET_KEY', sensitive: true, source: 'vercel-env' },
];

export const REQUIRED_DEPLOY_ENV: readonly string[] = REQUIRED_DEPLOY_ENV_VARS.map(
  ({ name }) => name
);

/** Names whose pulled "value" is a redaction marker — presence-only. */
export const SENSITIVE_DEPLOY_ENV: readonly string[] = REQUIRED_DEPLOY_ENV_VARS.filter(
  (envVar) => envVar.sensitive
).map(({ name }) => name);

/**
 * Present in production only by mistake. EMAIL_LOG_UNSENT opts the JSON
 * email transport into logging full message bodies (confirm/unsubscribe
 * tokens included) — an E2E-harness affordance that must never reach
 * production logs.
 */
export const FORBIDDEN_DEPLOY_ENV = ['EMAIL_LOG_UNSENT'] as const;

/**
 * Derived view of the records that declare a format — structurally free of
 * sensitive names, because the type refuses the combination.
 */
export const DEPLOY_ENV_FORMATS: ReadonlyMap<string, DeployEnvFormat> = new Map(
  REQUIRED_DEPLOY_ENV_VARS.flatMap((envVar) =>
    envVar.sensitive || !envVar.format ? [] : [[envVar.name, envVar.format] as const]
  )
);

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
