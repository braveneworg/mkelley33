/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { readFileSync } from 'node:fs';

/**
 * Repo-policy check, not a unit test. The production build must happen ON
 * Vercel, never on the GitHub runner.
 *
 * `vercel pull` cannot read back an environment variable stored as
 * sensitive — it writes a redaction marker in place of the value. Building
 * off-platform with `vercel build` therefore compiles production against
 * those markers. Observed 2026-07-30: DATABASE_URL, PAYLOAD_SECRET,
 * SMTP_PASS, SMTP_USER and TURNSTILE_SECRET_KEY all pulled the same
 * 11-character string, and the build died in `new ConnectionString(...)`
 * with a MongoParseError that reads like a network fault and is not one —
 * the driver was handed the marker, and never opened a socket.
 *
 * `vercel deploy --prod` without `--prebuilt` uploads the source and builds
 * on Vercel, where the real values are injected. It costs build minutes and
 * a slower pipeline; that is the price of a build that can see its secrets.
 *
 * The preflight stays in front of the deploy. It can only assert PRESENCE
 * for sensitive names, since it sees markers rather than values — which is
 * exactly why format checks in DEPLOY_ENV_FORMATS are limited to variables
 * that are not stored as sensitive.
 */

/**
 * The `deploy:` job block, sliced out so assertions cannot match another job,
 * with comment-only lines dropped — a comment explaining why the runner must
 * not call `vercel build` would otherwise trip an assertion looking for that
 * command as a step.
 */
const deployJob = (): string => {
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
  const lines = ci.split('\n');
  const start = lines.findIndex((line) => /^ {2}deploy:\s*$/.test(line));
  if (start === -1) {
    return '';
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^ {2}\S/.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).filter((line) => !/^\s*#/.test(line)).join('\n');
};

describe('deploy job', () => {
  it('exists in the workflow', () => {
    expect(deployJob()).not.toBe('');
  });

  it('never builds the production output on the runner', () => {
    expect(deployJob()).not.toMatch(/vercel build/);
  });

  it('never deploys a prebuilt artifact', () => {
    expect(deployJob()).not.toMatch(/--prebuilt/);
  });

  it('deploys to production, letting Vercel build', () => {
    expect(deployJob()).toMatch(/vercel deploy[^\n]*--prod/);
  });

  it('still runs the env preflight before deploying', () => {
    const job = deployJob();
    expect(job.indexOf('check-deploy-env')).toBeLessThan(job.indexOf('vercel deploy'));
  });
});
