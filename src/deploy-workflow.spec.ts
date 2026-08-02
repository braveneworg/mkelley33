/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { deployJobSteps } from '@/lib/deploy/ci-workflow';

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
 *
 * Assertions run over the deploy job's parsed step list — comments are not
 * steps, so a comment naming `vercel build` cannot trip anything — and
 * `stepIndex` throws on a step that is not there. The predecessor of this
 * spec compared raw `indexOf` results over the file's text, where a deleted
 * preflight step yielded -1 < anything and the ordering guard passed
 * vacuously.
 */

const steps = deployJobSteps();

const stepIndex = (pattern: RegExp): number => {
  const index = steps.findIndex((step) => pattern.test(step.run ?? ''));
  if (index === -1) {
    throw new Error(`no deploy step runs ${String(pattern)}`);
  }
  return index;
};

describe('deploy job', () => {
  it('exists in the workflow with steps', () => {
    expect(steps.length).toBeGreaterThan(0);
  });

  it('never builds the production output on the runner', () => {
    expect(steps.filter((step) => /vercel build/.test(step.run ?? ''))).toEqual([]);
  });

  it('never deploys a prebuilt artifact', () => {
    expect(steps.filter((step) => /--prebuilt/.test(step.run ?? ''))).toEqual([]);
  });

  it('deploys to production, letting Vercel build', () => {
    expect(steps[stepIndex(/vercel deploy/)]?.run).toMatch(/--prod/);
  });

  it('runs the env preflight against the pulled env', () => {
    expect(steps[stepIndex(/check-deploy-env/)]?.run).toMatch(/\.env\.production\.local/);
  });

  it('runs the preflight before deploying', () => {
    expect(stepIndex(/check-deploy-env/)).toBeLessThan(stepIndex(/vercel deploy/));
  });
});
