/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { existsSync, readFileSync } from 'node:fs';

/**
 * Repo-policy check, not a unit test. Two files name a Node version and
 * nothing links them. `mise.toml` is the version actually installed — by
 * `mise` locally and by `node-version-file` in every job of
 * `.github/workflows/ci.yml`. `engines.node` is the floor pnpm enforces, and
 * `engineStrict` in `pnpm-workspace.yaml` makes a mismatch a non-zero exit
 * rather than a warning.
 *
 * They are required to name the *same* version, not merely compatible ones,
 * because the binding constraint is a ceiling: Vercel installs and builds on
 * whichever 24.x patch its build image carries, and it enforces this floor
 * the same way the runner does. A floor above that image fails every Vercel
 * install, and a `>=` floor cannot express a ceiling. Left to satisfy the
 * floor alone, `mise.toml` could drift upward and the suite would validate
 * the code against a Node the deploy never builds on — silently, since the
 * two values sit in different files and neither mentions the other. Raising
 * this pin means editing both files together, and confirming Vercel's build
 * image has reached the new version before you do (see docs/deploy.md).
 *
 * `mise.toml` is the only version file. A second one (`.nvmrc`,
 * `.node-version`, `.tool-versions`) would be a third declaration nothing
 * checks, and the tools that read those would install whatever it said.
 *
 * The production artifact is not built here: `deploy` runs
 * `vercel deploy --prod` and Vercel compiles it on its own Node (see
 * src/deploy-workflow.spec.ts). That removes one way a skew could ship, and
 * leaves this pin covering what the runner still does on `mise.toml` Node —
 * typecheck, lint, unit tests, and the whole `e2e` job.
 */

/** `engines.node`: a `>=` floor naming one exact version, not a range. */
const ENGINES_FLOOR = /^>=(\d+\.\d+\.\d+)$/;

/** `mise.toml`: the same version as an exact `node = "x.y.z"` tool entry. */
const MISE_NODE = /^node = "(\d+\.\d+\.\d+)"$/m;

/** Version files other tools read, which would compete with `mise.toml`. */
const RIVAL_VERSION_FILES = ['.nvmrc', '.node-version', '.tool-versions'] as const;

const enginesNode = (): string => {
  const packageJson: unknown = JSON.parse(readFileSync('package.json', 'utf8'));
  return (packageJson as { engines?: { node?: string } }).engines?.node ?? '';
};

const miseToml = (): string => readFileSync('mise.toml', 'utf8');

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

  it('states the mise.toml node tool as one exact version', () => {
    expect(miseToml()).toMatch(MISE_NODE);
  });

  it('installs exactly the Node the engines floor names', () => {
    expect(versionIn(miseToml(), MISE_NODE)).toBe(versionIn(enginesNode(), ENGINES_FLOOR));
  });

  it.each(RIVAL_VERSION_FILES)('keeps %s out of the repo', (file) => {
    expect(existsSync(file)).toBe(false);
  });
});
