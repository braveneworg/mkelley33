/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * The E2E harness's pure decisions — the pinned environment, the dedicated
 * port, and the two tokens that must never be confused for one another.
 * `scripts/e2e.ts` keeps the side effects (mongod, spawning, probing).
 *
 * Every invariant here is stated in prose in `e2e/AGENTS.md` and asserted in
 * `harness-config.spec.ts`, so weakening one fails the unit suite instead of
 * quietly changing what the E2E suite is allowed to touch.
 */

/**
 * Dedicated E2E port — never Next's default 3000. On 3000 a developer's
 * `pnpm dev` (often backed by a real database) could already be listening:
 * `next start` would die with EADDRINUSE into e2e-server.log while the
 * readiness probes pass against the FOREIGN server and the suite writes to
 * it. The harness's `assertPortFree` guard closes the rest of that gap.
 */
export const E2E_PORT = 4310;

export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

/**
 * Seeding uses fail-fast driver params so a real connection failure surfaces
 * quickly; build and serve keep the patient params `scripts/ci-build.ts`
 * documents for prerender freezes.
 */
export const FAST_DRIVER_PARAMS = 'connectTimeoutMS=15000&serverSelectionTimeoutMS=15000';

export const PATIENT_DRIVER_PARAMS = 'connectTimeoutMS=120000&serverSelectionTimeoutMS=120000';

/**
 * The confirm link the newsletter spec scrapes out of `e2e-server.log`, and
 * the reason `EMAIL_LOG_UNSENT` is on. Shared with `e2e/newsletter.spec.ts`
 * rather than copied: the probe token below is only provably distinct from a
 * real token while both sides read the same pattern.
 */
export const CONFIRM_TOKEN_PATTERN = /\/newsletter\/confirm\?token=([0-9a-f]{64})/;

/**
 * The DB readiness probe's token: full length, so the route runs the same
 * lookup a real token would, but deliberately NON-hex so it can never match
 * `CONFIRM_TOKEN_PATTERN` if the probe URL is ever logged.
 */
export const DB_PROBE_TOKEN = 'z'.repeat(64);

/**
 * A DB-backed route proves the server's mongo pool actually works — the home
 * page alone can serve prerendered HTML with a wedged pool behind it. The
 * route treats any unknown token as invalid, which still exercises the lookup.
 */
export const dbProbeUrl = (baseUrl: string): string =>
  `${baseUrl}/newsletter/confirm?token=${DB_PROBE_TOKEN}`;

/**
 * Hermetic env: the suite must never touch a developer database or real
 * third-party services, so every env-sensitive key is pinned here and the
 * pins come last — explicit process env always wins over an env file, and
 * these values always win over the surrounding shell. Never weaken one to
 * "fix" a failure.
 */
export const makeEnv = (uri: string, driverParams: string): NodeJS.ProcessEnv => ({
  ...process.env,
  // Truthiness-gated in payload.config.ts — '' keeps the plugin off.
  BLOB_READ_WRITE_TOKEN: '',
  DATABASE_URL: `${uri}?${driverParams}`,
  // Lets the newsletter spec scrape the confirm link from e2e-server.log —
  // without this opt-in the JSON transport never logs message content.
  EMAIL_LOG_UNSENT: 'true',
  // Cloudflare's official always-pass Turnstile test keys (public values,
  // already hardcoded as the dev/CI fallback in src/lib/turnstile.ts).
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
  PAYLOAD_SECRET: 'e2e-secret',
  // '' forces the JSON transport so no real email can ever leave the suite.
  SMTP_HOST: '',
  TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
});
