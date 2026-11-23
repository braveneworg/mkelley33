/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { readFileSync } from 'node:fs';

/**
 * Repo-policy check, not a unit test. Two independent things can promote this
 * project to production: Vercel's own Git integration, which builds on every
 * push it is told about, and the `deploy` job in `.github/workflows/ci.yml`,
 * which runs `vercel deploy --prod` after both gates pass. Exactly one of
 * them may own `main`.
 *
 * The `deploy` job owns it, because only that path runs the env preflight
 * (`scripts/check-deploy-env.ts`) and waits on `e2e`. Git auto-deploy has
 * neither, so a missing `PAYLOAD_SECRET` would ship a broken production
 * instead of failing the deploy. Leaving both enabled also races two builds
 * of the same commit to the production alias.
 *
 * Preview deployments are off as well, so the value is a bare `false` rather
 * than `main` alone. The owner decided on 2026-11-23 that a pull request is
 * judged by the `ci` and `e2e` jobs and nothing else, and took the preview
 * out: with the Git integration on, every push to a branch adds a `Vercel`
 * status to the pull request beside those two. A preview can still be made
 * by hand with `vercel deploy`; this only stops the automatic ones.
 */

interface VercelConfig {
  git?: {
    deploymentEnabled?: boolean | Record<string, boolean>;
  };
}

const vercelConfig = (): VercelConfig => {
  const parsed: unknown = JSON.parse(readFileSync('vercel.json', 'utf8'));
  return parsed as VercelConfig;
};

describe('vercel.json git triggers', () => {
  it('turns off automatic deployment for every branch, main included', () => {
    const { git } = vercelConfig();
    expect(git?.deploymentEnabled).toBe(false);
  });
});
