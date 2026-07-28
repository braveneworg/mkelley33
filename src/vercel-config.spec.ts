/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { readFileSync } from 'node:fs';

/**
 * Repo-policy check, not a unit test. Two independent things can promote this
 * project to production: Vercel's own Git integration, which builds on every
 * push it is told about, and the `deploy` job in `.github/workflows/ci.yml`,
 * which runs `vercel deploy --prebuilt --prod` after both gates pass. Exactly
 * one of them may own `main`.
 *
 * The `deploy` job owns it, because only that path runs the env preflight
 * (`scripts/check-deploy-env.ts`) and waits on `e2e`. Git auto-deploy has
 * neither, so a missing `PAYLOAD_SECRET` would ship a broken production
 * instead of failing the deploy. Leaving both enabled also races two builds
 * of the same commit to the production alias.
 *
 * Preview deployments on other branches stay on — they are useful and cost
 * nothing here, which is why this pins `main` specifically rather than
 * setting `deploymentEnabled` to a bare `false`.
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
  it('turns off automatic deployment for main', () => {
    const { git } = vercelConfig();
    const enabled = git?.deploymentEnabled;
    /** A Map, since reading a record by a computed key trips detect-object-injection. */
    const perBranch = new Map(Object.entries(typeof enabled === 'object' ? enabled : {}));
    expect(perBranch.get('main')).toBe(false);
  });

  it('leaves other branches deploying, rather than disabling every branch', () => {
    const { git } = vercelConfig();
    expect(git?.deploymentEnabled).not.toBe(false);
  });
});
