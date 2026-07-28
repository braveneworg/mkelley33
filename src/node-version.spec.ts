/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { readFileSync } from 'node:fs';

/**
 * Repo-policy check, not a unit test. Two files name a Node version and
 * nothing links them. `.nvmrc` is the version actually installed — by `nvm`
 * locally and by `node-version-file` in every job of
 * `.github/workflows/ci.yml`, including the `deploy` job, whose
 * `vercel build --prod` step compiles the very artifact production executes.
 * `engines.node` is the floor pnpm enforces, and `engineStrict` in
 * `pnpm-workspace.yaml` makes a mismatch a non-zero exit rather than a
 * warning.
 *
 * They are required to name the *same* version, not merely compatible ones,
 * because the binding constraint is a ceiling: Vercel's `nodejs24.x` runtime
 * tops out at the version named here, and a `>=` floor cannot express a
 * ceiling. Left to satisfy the floor alone, `.nvmrc` could drift upward and
 * CI would ship an artifact built against a Node the functions never run —
 * silently, since the two values sit in different files and neither mentions
 * the other. Raising this pin means editing both files together, and
 * confirming Vercel supports the new version before you do.
 */

/** `engines.node`: a `>=` floor naming one exact version, not a range. */
const ENGINES_FLOOR = /^>=(\d+\.\d+\.\d+)$/;

/** `.nvmrc`: the same version, `v`-prefixed. */
const NVMRC_VERSION = /^v(\d+\.\d+\.\d+)$/;

const enginesNode = (): string => {
  const packageJson: unknown = JSON.parse(readFileSync('package.json', 'utf8'));
  return (packageJson as { engines?: { node?: string } }).engines?.node ?? '';
};

const nvmrc = (): string => readFileSync('.nvmrc', 'utf8').trim();

/** The bare `x.y.z` inside a declaration, or a failure naming what was found. */
const versionIn = (declaration: string, pattern: RegExp): string => {
  const match = pattern.exec(declaration);
  if (match === null) {
    throw new Error(`does not name one exact version: "${declaration}"`);
  }
  const [, version] = match;
  return version;
};

describe('Node version declarations', () => {
  it('states engines.node as a plain >=x.y.z floor', () => {
    expect(enginesNode()).toMatch(ENGINES_FLOOR);
  });

  it('states .nvmrc as a single v-prefixed version', () => {
    expect(nvmrc()).toMatch(NVMRC_VERSION);
  });

  it('installs exactly the Node the engines floor names', () => {
    expect(versionIn(nvmrc(), NVMRC_VERSION)).toBe(versionIn(enginesNode(), ENGINES_FLOOR));
  });
});
